import type { PrismaClient } from "@prisma/client";
import type { CardCatalogRepository } from "@/modules/catalog/domain/card-catalog-repository";
import type {
  CardDetailRecord,
  CardRulingRecord,
  CardPrintingRecord,
  CardSearchResult,
  NormalizedCardSearchInput,
} from "@/modules/catalog/domain/card-record";
import { fetchScryfallRulings } from "@/modules/catalog/infrastructure/scryfall/fetch-rulings";
import { toPriceSnapshot } from "@/modules/pricing";

function toPrintingRecord(printing: {
  scryfallPrintingId: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  rarity: string;
  releasedAt: Date | null;
  finishes: string[];
  imageUriNormal: string | null;
  imageUriArtCrop: string | null;
  priceSnapshot: {
    source: string;
    capturedAt: Date;
    usd: number | { toNumber(): number } | null;
    usdFoil: number | { toNumber(): number } | null;
    usdEtched: number | { toNumber(): number } | null;
    eur: number | { toNumber(): number } | null;
    eurFoil: number | { toNumber(): number } | null;
    tix: number | { toNumber(): number } | null;
  } | null;
}): CardPrintingRecord {
  return {
    id: printing.scryfallPrintingId,
    setCode: printing.setCode,
    setName: printing.setName,
    collectorNumber: printing.collectorNumber,
    rarity: printing.rarity,
    releasedAt: printing.releasedAt ? printing.releasedAt.toISOString().slice(0, 10) : null,
    finishes: printing.finishes,
    imageUris: {
      normal: printing.imageUriNormal,
      artCrop: printing.imageUriArtCrop,
      borderCrop: null,
    },
    faces: [],
    price: toPriceSnapshot(printing.priceSnapshot),
  };
}

export class LibraryCardCatalogRepository implements CardCatalogRepository {
  constructor(
    private readonly db: PrismaClient | undefined,
    private readonly userId: string,
  ) {}

  async search(input: NormalizedCardSearchInput): Promise<CardSearchResult> {
    if (!this.db) {
      return { items: [], hasMore: false, nextPage: null, total: 0 };
    }

    const cardWhere = {
      ...(input.commanderOnly ? { legalCommander: true } : {}),
      ...(input.query
        ? {
            normalizedName: {
              contains: input.query.toLowerCase(),
            },
          }
        : {}),
      ...(input.colors.length > 0 ? { colorIdentity: { hasEvery: input.colors } } : {}),
      ...(input.typeLine
        ? {
            typeLine: {
              contains: input.typeLine,
              mode: "insensitive" as const,
            },
          }
        : {}),
    };

    const holdings = await this.db.collectionHolding.findMany({
      where: {
        entry: {
          userId: this.userId,
          card: cardWhere,
        },
      },
      take: input.pageSize,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        entry: {
          include: {
            card: {
              select: {
                id: true,
                scryfallId: true,
                oracleId: true,
                name: true,
                manaCost: true,
                typeLine: true,
                oracleText: true,
                imageUriNormal: true,
                imageUriArtCrop: true,
                colorIdentity: true,
                cmc: true,
                legalCommander: true,
              },
            },
            printing: {
              select: {
                priceSnapshot: {
                  select: {
                    source: true,
                    capturedAt: true,
                    usd: true,
                    usdFoil: true,
                    usdEtched: true,
                    eur: true,
                    eurFoil: true,
                    tix: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      items: holdings.map((holding) => ({
        id: holding.entry.card.scryfallId,
        oracleId: holding.entry.card.oracleId,
        name: holding.entry.card.name,
        manaCost: holding.entry.card.manaCost,
        typeLine: holding.entry.card.typeLine,
        oracleText: holding.entry.card.oracleText,
        imageUri: holding.entry.card.imageUriNormal,
        colorIdentity: holding.entry.card.colorIdentity,
        cmc: Number(holding.entry.card.cmc),
        legalCommander: holding.entry.card.legalCommander,
        price: toPriceSnapshot(holding.entry.printing?.priceSnapshot ?? null),
      })),
      hasMore: false,
      nextPage: null,
      total: holdings.length,
    };
  }

  async getById(cardId: string): Promise<CardDetailRecord | null> {
    if (!this.db) {
      return null;
    }

    const card = await this.db.card.findFirst({
      where: {
        scryfallId: cardId,
        collectionEntries: {
          some: {
            userId: this.userId,
          },
        },
      },
      include: {
        printings: {
          orderBy: [{ releasedAt: "desc" }],
          take: 24,
          include: {
            priceSnapshot: true,
          },
        },
      },
    });

    if (!card) {
      return null;
    }
    let rulings: CardRulingRecord[] = [];
    try {
      rulings = await fetchScryfallRulings(card.scryfallId);
    } catch {
      rulings = [];
    }

    const legalities = {
      commander: card.legalCommander ? "legal" : "not_legal",
    } as const;

    return {
      id: card.scryfallId,
      oracleId: card.oracleId,
      name: card.name,
      manaCost: card.manaCost,
      typeLine: card.typeLine,
      oracleText: card.oracleText,
      imageUri: card.imageUriNormal,
      imageUris: {
        normal: card.imageUriNormal,
        artCrop: card.imageUriArtCrop,
        borderCrop: null,
      },
      faces: [],
      colorIdentity: card.colorIdentity,
      cmc: Number(card.cmc),
      legalCommander: card.legalCommander,
      price: toPriceSnapshot(card.printings.at(0)?.priceSnapshot ?? null),
      legalities,
      rulings,
      printings: card.printings.map(toPrintingRecord),
    };
  }
}
