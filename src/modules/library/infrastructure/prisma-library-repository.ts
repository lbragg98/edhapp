import type { PrismaClient } from "@prisma/client";
import type { LibraryRepository } from "@/modules/library/domain/library-repository";
import type {
  AddLibraryCardInput,
  AdjustLibraryHoldingInput,
  LibraryRecord,
  NormalizedLibrarySearchInput,
} from "@/modules/library/domain/library-record";
import { scryfallCardSchema } from "@/modules/catalog/infrastructure/scryfall/schemas";
import { parseExternalPrice, toPriceSnapshot } from "@/modules/pricing";

const SCRYFALL_API_BASE = "https://api.scryfall.com";

function normalizeImageUri(card: ReturnType<typeof scryfallCardSchema.parse>): string | null {
  if (card.image_uris?.normal) {
    return card.image_uris.normal;
  }

  const firstFace = card.card_faces?.find((face) => face.image_uris?.normal);

  return firstFace?.image_uris?.normal ?? null;
}

function mapLayout(layout?: string):
  | "NORMAL"
  | "SPLIT"
  | "MODAL_DFC"
  | "TRANSFORM"
  | "ADVENTURE"
  | "SAGA"
  | "OTHER" {
  const candidate = (layout ?? "").toLowerCase();

  if (candidate === "split") return "SPLIT";
  if (candidate === "modal_dfc") return "MODAL_DFC";
  if (candidate === "transform") return "TRANSFORM";
  if (candidate === "adventure") return "ADVENTURE";
  if (candidate === "saga") return "SAGA";
  if (candidate === "normal") return "NORMAL";

  return "OTHER";
}

function toLibraryRecord(holding: {
  id: string;
  entryId: string;
  finish: "NONFOIL" | "FOIL" | "ETCHED";
  condition: "NM" | "LP" | "MP" | "HP" | "DMG";
  quantity: number;
  entry: {
    id: string;
    note: string | null;
    card: {
      id: string;
      oracleId: string;
      scryfallId: string;
      name: string;
      manaCost: string | null;
      typeLine: string;
      imageUriNormal: string | null;
      colorIdentity: string[];
    };
    printing: {
      id: string;
      setCode: string;
      setName: string;
      collectorNumber: string;
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
    } | null;
  };
}): LibraryRecord {
  return {
    holdingId: holding.id,
    entryId: holding.entry.id,
    cardId: holding.entry.card.id,
    oracleId: holding.entry.card.oracleId,
    printingId: holding.entry.printing?.id ?? null,
    scryfallId: holding.entry.card.scryfallId,
    name: holding.entry.card.name,
    manaCost: holding.entry.card.manaCost,
    typeLine: holding.entry.card.typeLine,
    imageUri: holding.entry.card.imageUriNormal,
    colorIdentity: holding.entry.card.colorIdentity,
    setCode: holding.entry.printing?.setCode ?? null,
    setName: holding.entry.printing?.setName ?? null,
    collectorNumber: holding.entry.printing?.collectorNumber ?? null,
    finish: holding.finish,
    condition: holding.condition,
    quantity: holding.quantity,
    note: holding.entry.note,
    price: toPriceSnapshot(holding.entry.printing?.priceSnapshot ?? null),
  };
}

function readPricePayload(card: ReturnType<typeof scryfallCardSchema.parse>) {
  const usd = parseExternalPrice(card.prices?.usd);
  const usdFoil = parseExternalPrice(card.prices?.usd_foil);
  const usdEtched = parseExternalPrice(card.prices?.usd_etched);
  const eur = parseExternalPrice(card.prices?.eur);
  const eurFoil = parseExternalPrice(card.prices?.eur_foil);
  const tix = parseExternalPrice(card.prices?.tix);

  return { usd, usdFoil, usdEtched, eur, eurFoil, tix };
}

function hasAnyPriceValue(value: ReturnType<typeof readPricePayload>): boolean {
  return (
    value.usd !== null ||
    value.usdFoil !== null ||
    value.usdEtched !== null ||
    value.eur !== null ||
    value.eurFoil !== null ||
    value.tix !== null
  );
}

async function fetchScryfallCard(scryfallCardId: string) {
  const response = await fetch(`${SCRYFALL_API_BASE}/cards/${scryfallCardId}`, {
    headers: {
      "User-Agent": "CommandTower/0.1 (https://example.com)",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch card from Scryfall");
  }

  const json = (await response.json()) as unknown;

  return scryfallCardSchema.parse(json);
}

export class PrismaLibraryRepository implements LibraryRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly userId: string,
  ) {}

  async list(input: NormalizedLibrarySearchInput): Promise<LibraryRecord[]> {
    const cardWhere = {
      ...(input.query
        ? {
            normalizedName: {
              contains: input.query.toLowerCase(),
            },
          }
        : {}),
      ...(input.colors.length > 0 ? { colorIdentity: { hasEvery: input.colors } } : {}),
    };

    const holdings = await this.db.collectionHolding.findMany({
      where: {
        ...(input.finish ? { finish: input.finish } : {}),
        ...(input.condition ? { condition: input.condition } : {}),
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
                oracleId: true,
                scryfallId: true,
                name: true,
                manaCost: true,
                typeLine: true,
                imageUriNormal: true,
                colorIdentity: true,
              },
            },
            printing: {
              select: {
                id: true,
                setCode: true,
                setName: true,
                collectorNumber: true,
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

    return holdings.map(toLibraryRecord);
  }

  async add(input: AddLibraryCardInput): Promise<LibraryRecord> {
    const card = await fetchScryfallCard(input.scryfallCardId);
    const imageUri = normalizeImageUri(card);

    return this.db.$transaction(async (tx) => {
      const upsertedCard = await tx.card.upsert({
        where: { scryfallId: card.id },
        update: {
          name: card.name,
          normalizedName: card.name.toLowerCase(),
          manaCost: card.mana_cost ?? null,
          cmc: card.cmc,
          typeLine: card.type_line,
          oracleText: card.oracle_text ?? null,
          colorIdentity: card.color_identity,
          legalCommander: card.legalities.commander === "legal",
          imageUriNormal: imageUri,
          layout: mapLayout(card.layout),
          lastSyncedAt: new Date(),
        },
        create: {
          oracleId: card.oracle_id ?? card.id,
          scryfallId: card.id,
          name: card.name,
          normalizedName: card.name.toLowerCase(),
          manaCost: card.mana_cost ?? null,
          cmc: card.cmc,
          typeLine: card.type_line,
          oracleText: card.oracle_text ?? null,
          colorIdentity: card.color_identity,
          keywords: [],
          legalCommander: card.legalities.commander === "legal",
          imageUriNormal: imageUri,
          layout: mapLayout(card.layout),
        },
      });

      const printing = await tx.cardPrinting.upsert({
        where: { scryfallPrintingId: card.id },
        update: {
          cardId: upsertedCard.id,
          setCode: (card.set ?? "").toUpperCase(),
          setName: card.set_name ?? "",
          collectorNumber: card.collector_number ?? "",
          rarity: card.rarity ?? "",
          releasedAt: card.released_at ? new Date(card.released_at) : null,
          finishes: card.finishes ?? [],
          imageUriNormal: imageUri,
        },
        create: {
          cardId: upsertedCard.id,
          scryfallPrintingId: card.id,
          setCode: (card.set ?? "").toUpperCase(),
          setName: card.set_name ?? "",
          collectorNumber: card.collector_number ?? "",
          rarity: card.rarity ?? "",
          releasedAt: card.released_at ? new Date(card.released_at) : null,
          finishes: card.finishes ?? [],
          imageUriNormal: imageUri,
        },
      });

      const pricePayload = readPricePayload(card);

      if (hasAnyPriceValue(pricePayload)) {
        await tx.priceSnapshot.upsert({
          where: { printingId: printing.id },
          update: {
            source: "SCRYFALL",
            currency: "USD",
            usd: pricePayload.usd,
            usdFoil: pricePayload.usdFoil,
            usdEtched: pricePayload.usdEtched,
            eur: pricePayload.eur,
            eurFoil: pricePayload.eurFoil,
            tix: pricePayload.tix,
            capturedAt: new Date(),
          },
          create: {
            printingId: printing.id,
            source: "SCRYFALL",
            currency: "USD",
            usd: pricePayload.usd,
            usdFoil: pricePayload.usdFoil,
            usdEtched: pricePayload.usdEtched,
            eur: pricePayload.eur,
            eurFoil: pricePayload.eurFoil,
            tix: pricePayload.tix,
            capturedAt: new Date(),
          },
        });
      }

      const entry = await tx.collectionEntry.upsert({
        where: {
          userId_cardId_printingId: {
            userId: this.userId,
            cardId: upsertedCard.id,
            printingId: printing.id,
          },
        },
        update: {
          note: input.note ?? null,
        },
        create: {
          userId: this.userId,
          cardId: upsertedCard.id,
          printingId: printing.id,
          note: input.note ?? null,
        },
      });

      const holding = await tx.collectionHolding.upsert({
        where: {
          entryId_finish_condition: {
            entryId: entry.id,
            finish: input.finish ?? "NONFOIL",
            condition: input.condition ?? "NM",
          },
        },
        update: {
          quantity: {
            increment: input.quantity ?? 1,
          },
        },
        create: {
          entryId: entry.id,
          finish: input.finish ?? "NONFOIL",
          condition: input.condition ?? "NM",
          quantity: input.quantity ?? 1,
        },
        include: {
          entry: {
            include: {
              card: {
                select: {
                  id: true,
                  oracleId: true,
                  scryfallId: true,
                  name: true,
                  manaCost: true,
                  typeLine: true,
                  imageUriNormal: true,
                  colorIdentity: true,
                },
              },
              printing: {
                select: {
                  id: true,
                  setCode: true,
                  setName: true,
                  collectorNumber: true,
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

      return toLibraryRecord(holding);
    });
  }

  async adjust(input: AdjustLibraryHoldingInput): Promise<LibraryRecord | null> {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.collectionHolding.findUnique({
        where: { id: input.holdingId },
        include: {
          entry: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!existing || existing.entry.userId !== this.userId) {
        return null;
      }

      const nextQuantity = existing.quantity + input.delta;

      if (nextQuantity <= 0) {
        await tx.collectionHolding.delete({ where: { id: existing.id } });

        const remaining = await tx.collectionHolding.count({ where: { entryId: existing.entryId } });

        if (remaining === 0) {
          await tx.collectionEntry.delete({ where: { id: existing.entryId } });
        }

        return null;
      }

      const updated = await tx.collectionHolding.update({
        where: { id: existing.id },
        data: { quantity: nextQuantity },
        include: {
          entry: {
            include: {
              card: {
                select: {
                  id: true,
                  oracleId: true,
                  scryfallId: true,
                  name: true,
                  manaCost: true,
                  typeLine: true,
                  imageUriNormal: true,
                  colorIdentity: true,
                },
              },
              printing: {
                select: {
                  id: true,
                  setCode: true,
                  setName: true,
                  collectorNumber: true,
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

      return toLibraryRecord(updated);
    });
  }
}
