import { z } from "zod";
import type { DeckRepository } from "@/modules/deck/domain/deck-repository";
import type {
  AddDeckCardInput,
  AdjustDeckCardInput,
  CreateDeckInput,
  DeckSourceMode,
  DeckRecord,
  UpdateDeckMetadataInput,
} from "@/modules/deck/domain/deck-record";
import { validateCommanderDeck } from "@/modules/deck/domain/validate-commander-deck";
import { analyzeDeckComposition } from "@/modules/deck/domain/analyze-deck-composition";
import { buildDeckIntelligence } from "@/modules/deck/domain/build-deck-intelligence";
import type { ComboDataSource } from "@/modules/deck/domain/combo-data-source";
import type { DeckSuggestionSourceProvider } from "@/modules/deck/domain/deck-intelligence";
import type { DeckPlaytestReport } from "@/modules/deck/domain/deck-playtest";
import { runDeckPlaytest } from "@/modules/deck/domain/run-deck-playtest";
import type { DeckUpgradeMode, DeckUpgradeReport } from "@/modules/deck/domain/deck-upgrade";
import { buildDeckUpgrades } from "@/modules/deck/domain/build-deck-upgrades";

const createDeckSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sourceMode: z.enum(["all", "library"]).optional(),
  description: z.string().trim().max(250).optional(),
  notes: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).optional(),
});

const addDeckCardSchema = z.object({
  deckId: z.string().trim().min(1),
  sourceMode: z.enum(["all", "library"]),
  sourceItemId: z.string().trim().min(1),
  cardId: z.string().trim().min(1),
  scryfallId: z.string().trim().min(1),
  printingId: z.string().trim().nullable(),
  zone: z.enum(["commander", "mainboard"]),
});

const adjustDeckCardSchema = z.object({
  deckId: z.string().trim().min(1),
  entryId: z.string().trim().min(1),
  delta: z.number().int().min(-10).max(10).refine((value) => value !== 0),
});

const updateDeckMetadataSchema = z.object({
  deckId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(250).optional(),
  notes: z.string().trim().max(2000).optional(),
  sourceMode: z.enum(["all", "library"]).optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).optional(),
});

const playtestInputSchema = z.object({
  deckId: z.string().trim().min(1),
  runs: z.number().int().min(20).max(2000).default(250),
  turns: z.number().int().min(4).max(10).default(7),
  sourceMode: z.enum(["all", "library"]).optional(),
});

const deckUpgradeInputSchema = z.object({
  deckId: z.string().trim().min(1),
  mode: z.enum(["all", "library"]).default("all"),
});

export type DeckWithValidation = {
  deck: DeckRecord;
  validation: ReturnType<typeof validateCommanderDeck>;
  analytics: ReturnType<typeof analyzeDeckComposition>;
  intelligence: Awaited<ReturnType<typeof buildDeckIntelligence>>;
};

async function buildValidation(deck: DeckRecord, repository: DeckRepository) {
  const ownedLookup = new Map<string, number>();

  for (const entry of deck.cards) {
    if (ownedLookup.has(entry.cardId)) {
      continue;
    }

    const owned = await repository.getOwnedQuantity({
      cardId: entry.cardId,
      printingId: entry.printingId,
    });

    ownedLookup.set(entry.cardId, owned);
  }

  return validateCommanderDeck(deck, ownedLookup);
}

export class DeckService {
  constructor(
    private readonly repository: DeckRepository,
    private readonly intelligenceDependencies: {
      sourceProvider: DeckSuggestionSourceProvider;
      comboDataSource: ComboDataSource;
    },
  ) {}

  private async buildPayload(deck: DeckRecord): Promise<DeckWithValidation> {
    const validation = await buildValidation(deck, this.repository);
    const analytics = analyzeDeckComposition(deck);
    const intelligence = await buildDeckIntelligence({
      analytics,
      context: {
        deck,
        sourceMode: deck.preferredSource,
        commanderColors: validation.commanderColorIdentity,
      },
      sourceProvider: this.intelligenceDependencies.sourceProvider,
      comboDataSource: this.intelligenceDependencies.comboDataSource,
    });

    return { deck, validation, analytics, intelligence };
  }

  list() {
    return this.repository.list();
  }

  async getById(deckId: string): Promise<DeckWithValidation | null> {
    const deck = await this.repository.getById(deckId);

    if (!deck) {
      return null;
    }

    return this.buildPayload(deck);
  }

  async create(input: CreateDeckInput): Promise<DeckWithValidation> {
    const parsed = createDeckSchema.parse(input);
    const deck = await this.repository.create({
      name: parsed.name,
      ...(parsed.sourceMode ? { sourceMode: parsed.sourceMode } : {}),
      ...(parsed.description ? { description: parsed.description } : {}),
      ...(parsed.notes ? { notes: parsed.notes } : {}),
      ...(parsed.tags ? { tags: parsed.tags } : {}),
    });
    return this.buildPayload(deck);
  }

  async updateMetadata(input: UpdateDeckMetadataInput): Promise<DeckWithValidation | null> {
    const parsed = updateDeckMetadataSchema.parse(input);
    const deck = await this.repository.updateMetadata({
      deckId: parsed.deckId,
      ...(parsed.name ? { name: parsed.name } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description } : {}),
      ...(parsed.notes !== undefined ? { notes: parsed.notes } : {}),
      ...(parsed.sourceMode ? { sourceMode: parsed.sourceMode } : {}),
      ...(parsed.tags ? { tags: parsed.tags } : {}),
    });

    if (!deck) {
      return null;
    }

    return this.buildPayload(deck);
  }

  async addCard(input: AddDeckCardInput): Promise<DeckWithValidation | null> {
    const parsed = addDeckCardSchema.parse(input);

    if (parsed.sourceMode === "library") {
      const currentDeck = await this.repository.getById(parsed.deckId);

      if (!currentDeck) {
        return null;
      }

      const currentQuantity = currentDeck.cards
        .filter((entry) => entry.cardId === parsed.cardId)
        .reduce((sum, entry) => sum + entry.quantity, 0);

      const owned = await this.repository.getOwnedQuantity({
        cardId: parsed.cardId,
        printingId: parsed.printingId,
      });

      if (currentQuantity + 1 > owned) {
        const validation = await buildValidation(currentDeck, this.repository);
        const analytics = analyzeDeckComposition(currentDeck);
        const intelligence = await buildDeckIntelligence({
          analytics,
          context: {
            deck: currentDeck,
            sourceMode: currentDeck.preferredSource,
            commanderColors: validation.commanderColorIdentity,
          },
          sourceProvider: this.intelligenceDependencies.sourceProvider,
          comboDataSource: this.intelligenceDependencies.comboDataSource,
        });

        return {
          deck: currentDeck,
          validation: {
            ...validation,
            issues: [
              ...validation.issues,
              {
                code: "library_quantity_exceeded",
                cardId: parsed.cardId,
                message: "Cannot add more than owned quantity in library mode.",
              },
            ],
          },
          analytics,
          intelligence,
        };
      }
    }

    const deck = await this.repository.addCard(parsed);

    if (!deck) {
      return null;
    }

    return this.buildPayload(deck);
  }

  async adjustCard(input: AdjustDeckCardInput): Promise<DeckWithValidation | null> {
    const parsed = adjustDeckCardSchema.parse(input);
    const deck = await this.repository.adjustCard(parsed);

    if (!deck) {
      return null;
    }

    return this.buildPayload(deck);
  }

  async runPlaytest(input: {
    deckId: string;
    runs?: number;
    turns?: number;
    sourceMode?: DeckSourceMode;
  }): Promise<DeckPlaytestReport | null> {
    const parsed = playtestInputSchema.parse(input);
    const deck = await this.repository.getById(parsed.deckId);

    if (!deck) {
      return null;
    }

    const workingDeck =
      parsed.sourceMode && parsed.sourceMode !== deck.preferredSource
        ? { ...deck, preferredSource: parsed.sourceMode }
        : deck;

    return runDeckPlaytest(workingDeck, {
      runs: parsed.runs,
      turns: parsed.turns,
    });
  }

  async runUpgrades(input: {
    deckId: string;
    mode?: DeckUpgradeMode;
  }): Promise<DeckUpgradeReport | null> {
    const parsed = deckUpgradeInputSchema.parse(input);
    const deck = await this.repository.getById(parsed.deckId);

    if (!deck) {
      return null;
    }

    const validation = await buildValidation(deck, this.repository);
    const analytics = analyzeDeckComposition(deck);
    const intelligence = await buildDeckIntelligence({
      analytics,
      context: {
        deck,
        sourceMode: parsed.mode,
        commanderColors: validation.commanderColorIdentity,
      },
      sourceProvider: this.intelligenceDependencies.sourceProvider,
      comboDataSource: this.intelligenceDependencies.comboDataSource,
    });

    return buildDeckUpgrades({
      deck,
      analytics,
      intelligence,
      mode: parsed.mode,
      commanderColors: validation.commanderColorIdentity,
      sourceProvider: this.intelligenceDependencies.sourceProvider,
    });
  }
}
