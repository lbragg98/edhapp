import type { Prisma, PrismaClient } from "@prisma/client";
import type { DeckRepository, OwnedQuantityLookupInput } from "@/modules/deck/domain/deck-repository";
import type {
  AddDeckCardInput,
  AdjustDeckCardInput,
  CreateDeckInput,
  DeckRecord,
  DeckSourceMode,
  UpdateDeckMetadataInput,
} from "@/modules/deck/domain/deck-record";
import { scryfallCardSchema } from "@/modules/catalog/infrastructure/scryfall/schemas";
import { parseExternalPrice, toPriceSnapshot } from "@/modules/pricing";

const SCRYFALL_API_BASE = "https://api.scryfall.com";

type DeckWithRelations = Prisma.DeckGetPayload<{
  include: {
    tags: true;
    cards: {
      include: {
        card: true;
        printing: {
          include: {
            priceSnapshot: true;
          };
        };
      };
    };
  };
}>;

function toSourceMode(mode: "ALL" | "LIBRARY"): DeckSourceMode {
  return mode === "LIBRARY" ? "library" : "all";
}

function toDbSourceMode(mode: DeckSourceMode): "ALL" | "LIBRARY" {
  return mode === "library" ? "LIBRARY" : "ALL";
}

function toDbZone(zone: "commander" | "mainboard"): "COMMANDER" | "MAINBOARD" {
  return zone === "commander" ? "COMMANDER" : "MAINBOARD";
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
}

function resolveImageUri(card: ReturnType<typeof scryfallCardSchema.parse>): string | null {
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

function toDeckRecord(deck: DeckWithRelations): DeckRecord {
  return {
    id: deck.id,
    name: deck.name,
    slug: deck.slug,
    description: deck.description,
    notes: deck.notes,
    preferredSource: toSourceMode(deck.preferredSource),
    tags: deck.tags.map((tag) => tag.value),
    cards: deck.cards.map((entry) => ({
      id: entry.id,
      cardId: entry.card.id,
      oracleId: entry.card.oracleId,
      scryfallId: entry.card.scryfallId,
      printingId: entry.printingId,
      zone: entry.zone === "COMMANDER" ? "commander" : "mainboard",
      quantity: entry.quantity,
      name: entry.card.name,
      manaCost: entry.card.manaCost,
      typeLine: entry.card.typeLine,
      oracleText: entry.card.oracleText,
      imageUri: entry.card.imageUriNormal,
      colorIdentity: entry.card.colorIdentity,
      legalCommander: entry.card.legalCommander,
      note: entry.note,
      price: toPriceSnapshot(entry.printing?.priceSnapshot ?? null),
    })),
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
  };
}

async function fetchScryfallCardById(scryfallId: string) {
  const response = await fetch(`${SCRYFALL_API_BASE}/cards/${scryfallId}`, {
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

export class PrismaDeckRepository implements DeckRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly userId: string,
  ) {}

  private async ensureCardByOracleOrScryfall(
    tx: Prisma.TransactionClient,
    cardOracleId: string,
    scryfallId: string,
    printingScryfallId: string | null,
  ): Promise<{ cardId: string; printingId: string | null }> {
    const existingCard = await tx.card.findUnique({
      where: { oracleId: cardOracleId },
      select: { id: true },
    });

    if (existingCard) {
      let printingId: string | null = null;
      if (printingScryfallId) {
        const printing = await tx.cardPrinting.findUnique({
          where: { scryfallPrintingId: printingScryfallId },
          select: { id: true },
        });
        printingId = printing?.id ?? null;
      }

      return { cardId: existingCard.id, printingId };
    }

    const scryfallCard = await fetchScryfallCardById(scryfallId);
    const imageUri = resolveImageUri(scryfallCard);

    const upsertedCard = await tx.card.upsert({
      where: { oracleId: scryfallCard.oracle_id ?? scryfallCard.id },
      update: {
        name: scryfallCard.name,
        normalizedName: scryfallCard.name.toLowerCase(),
        manaCost: scryfallCard.mana_cost ?? null,
        cmc: scryfallCard.cmc,
        typeLine: scryfallCard.type_line,
        oracleText: scryfallCard.oracle_text ?? null,
        colorIdentity: scryfallCard.color_identity,
        legalCommander: scryfallCard.legalities.commander === "legal",
        imageUriNormal: imageUri,
        layout: mapLayout(scryfallCard.layout),
        lastSyncedAt: new Date(),
      },
      create: {
        oracleId: scryfallCard.oracle_id ?? scryfallCard.id,
        scryfallId: scryfallCard.id,
        name: scryfallCard.name,
        normalizedName: scryfallCard.name.toLowerCase(),
        manaCost: scryfallCard.mana_cost ?? null,
        cmc: scryfallCard.cmc,
        typeLine: scryfallCard.type_line,
        oracleText: scryfallCard.oracle_text ?? null,
        colorIdentity: scryfallCard.color_identity,
        keywords: [],
        legalCommander: scryfallCard.legalities.commander === "legal",
        imageUriNormal: imageUri,
        layout: mapLayout(scryfallCard.layout),
      },
      select: { id: true },
    });

    const printing = await tx.cardPrinting.upsert({
      where: { scryfallPrintingId: scryfallCard.id },
      update: {
        cardId: upsertedCard.id,
        setCode: (scryfallCard.set ?? "").toUpperCase(),
        setName: scryfallCard.set_name ?? "",
        collectorNumber: scryfallCard.collector_number ?? "",
        rarity: scryfallCard.rarity ?? "",
        releasedAt: scryfallCard.released_at ? new Date(scryfallCard.released_at) : null,
        finishes: scryfallCard.finishes ?? [],
        imageUriNormal: imageUri,
      },
      create: {
        cardId: upsertedCard.id,
        scryfallPrintingId: scryfallCard.id,
        setCode: (scryfallCard.set ?? "").toUpperCase(),
        setName: scryfallCard.set_name ?? "",
        collectorNumber: scryfallCard.collector_number ?? "",
        rarity: scryfallCard.rarity ?? "",
        releasedAt: scryfallCard.released_at ? new Date(scryfallCard.released_at) : null,
        finishes: scryfallCard.finishes ?? [],
        imageUriNormal: imageUri,
      },
      select: { id: true },
    });

    const pricePayload = readPricePayload(scryfallCard);

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

    return { cardId: upsertedCard.id, printingId: printing.id };
  }

  async list(): Promise<DeckRecord[]> {
    const decks = await this.db.deck.findMany({
      where: { userId: this.userId },
      include: {
        tags: true,
        cards: {
          include: {
            card: true,
            printing: {
              include: {
                priceSnapshot: true,
              },
            },
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    return decks.map(toDeckRecord);
  }

  async getById(deckId: string): Promise<DeckRecord | null> {
    const deck = await this.db.deck.findFirst({
      where: { id: deckId, userId: this.userId },
      include: {
        tags: true,
        cards: {
          include: {
            card: true,
            printing: {
              include: {
                priceSnapshot: true,
              },
            },
          },
        },
      },
    });

    return deck ? toDeckRecord(deck) : null;
  }

  async create(input: CreateDeckInput): Promise<DeckRecord> {
    return this.db.$transaction(async (tx) => {
      const baseSlug = toSlug(input.name);
      const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

      const deck = await tx.deck.create({
        data: {
          userId: this.userId,
          name: input.name,
          slug,
          description: input.description ?? null,
          notes: input.notes ?? null,
          preferredSource: toDbSourceMode(input.sourceMode ?? "all"),
          ...(input.tags?.length
            ? {
                tags: {
                  create: input.tags.map((tag) => ({ value: tag })),
                },
              }
            : {}),
        },
        include: {
          tags: true,
          cards: {
            include: {
              card: true,
              printing: {
                include: {
                  priceSnapshot: true,
                },
              },
            },
          },
        },
      });

      return toDeckRecord(deck);
    });
  }

  async updateMetadata(input: UpdateDeckMetadataInput): Promise<DeckRecord | null> {
    return this.db.$transaction(async (tx) => {
      const deck = await tx.deck.findFirst({
        where: { id: input.deckId, userId: this.userId },
        select: { id: true },
      });

      if (!deck) {
        return null;
      }

      if (input.tags) {
        await tx.deckTag.deleteMany({ where: { deckId: input.deckId } });
      }

      const updated = await tx.deck.update({
        where: { id: input.deckId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.sourceMode ? { preferredSource: toDbSourceMode(input.sourceMode) } : {}),
          ...(input.tags
            ? {
                tags: {
                  create: input.tags.map((tag) => ({ value: tag })),
                },
              }
            : {}),
        },
        include: {
          tags: true,
          cards: {
            include: {
              card: true,
              printing: {
                include: {
                  priceSnapshot: true,
                },
              },
            },
          },
        },
      });

      return toDeckRecord(updated);
    });
  }

  async addCard(input: AddDeckCardInput): Promise<DeckRecord | null> {
    return this.db.$transaction(async (tx) => {
      const deck = await tx.deck.findFirst({
        where: { id: input.deckId, userId: this.userId },
        select: { id: true },
      });

      if (!deck) {
        return null;
      }

      const resolved = await this.ensureCardByOracleOrScryfall(
        tx,
        input.cardId,
        input.scryfallId,
        input.printingId,
      );

      const zone = toDbZone(input.zone);

      if (zone === "COMMANDER") {
        await tx.deckCardEntry.deleteMany({ where: { deckId: input.deckId, zone: "COMMANDER" } });

        await tx.deckCardEntry.upsert({
          where: {
            deckId_cardId_zone: {
              deckId: input.deckId,
              cardId: resolved.cardId,
              zone,
            },
          },
          update: {
            quantity: 1,
            printingId: resolved.printingId,
          },
          create: {
            deckId: input.deckId,
            cardId: resolved.cardId,
            printingId: resolved.printingId,
            zone,
            quantity: 1,
          },
        });
      } else {
        await tx.deckCardEntry.upsert({
          where: {
            deckId_cardId_zone: {
              deckId: input.deckId,
              cardId: resolved.cardId,
              zone,
            },
          },
          update: {
            quantity: {
              increment: 1,
            },
            printingId: resolved.printingId,
          },
          create: {
            deckId: input.deckId,
            cardId: resolved.cardId,
            printingId: resolved.printingId,
            zone,
            quantity: 1,
          },
        });
      }

      const updatedDeck = await tx.deck.findUnique({
        where: { id: input.deckId },
        include: {
          tags: true,
          cards: {
            include: {
              card: true,
              printing: {
                include: {
                  priceSnapshot: true,
                },
              },
            },
          },
        },
      });

      return updatedDeck ? toDeckRecord(updatedDeck) : null;
    });
  }

  async adjustCard(input: AdjustDeckCardInput): Promise<DeckRecord | null> {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.deckCardEntry.findUnique({
        where: { id: input.entryId },
        include: {
          deck: {
            select: { userId: true },
          },
        },
      });

      if (!existing || existing.deckId !== input.deckId || existing.deck.userId !== this.userId) {
        return null;
      }

      if (existing.zone === "COMMANDER") {
        if (input.delta < 0) {
          await tx.deckCardEntry.delete({ where: { id: existing.id } });
        }
      } else {
        const nextQuantity = existing.quantity + input.delta;

        if (nextQuantity <= 0) {
          await tx.deckCardEntry.delete({ where: { id: existing.id } });
        } else {
          await tx.deckCardEntry.update({
            where: { id: existing.id },
            data: { quantity: nextQuantity },
          });
        }
      }

      const deck = await tx.deck.findUnique({
        where: { id: input.deckId },
        include: {
          tags: true,
          cards: {
            include: {
              card: true,
              printing: {
                include: {
                  priceSnapshot: true,
                },
              },
            },
          },
        },
      });

      return deck ? toDeckRecord(deck) : null;
    });
  }

  async getOwnedQuantity(input: OwnedQuantityLookupInput): Promise<number> {
    const card = await this.db.card.findUnique({
      where: { oracleId: input.cardId },
      select: { id: true },
    });

    if (!card) {
      return 0;
    }

    let printingId: string | null = null;

    if (input.printingId) {
      const printing = await this.db.cardPrinting.findUnique({
        where: { scryfallPrintingId: input.printingId },
        select: { id: true },
      });
      printingId = printing?.id ?? null;
    }

    const holdings = await this.db.collectionHolding.findMany({
      where: {
        entry: {
          userId: this.userId,
          cardId: card.id,
          ...(printingId ? { printingId } : {}),
        },
      },
      select: { quantity: true },
    });

    return holdings.reduce((sum, holding) => sum + holding.quantity, 0);
  }

  async getPreferredSource(deckId: string): Promise<DeckSourceMode | null> {
    const deck = await this.db.deck.findFirst({
      where: { id: deckId, userId: this.userId },
      select: { preferredSource: true },
    });

    return deck ? toSourceMode(deck.preferredSource) : null;
  }
}
