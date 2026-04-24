import { describe, expect, it } from "vitest";
import { DeckService } from "@/modules/deck/application/deck-service";
import type { ComboDataSource } from "@/modules/deck/domain/combo-data-source";
import type { DeckSuggestionSourceProvider } from "@/modules/deck/domain/deck-intelligence";
import type {
  AddDeckCardInput,
  AdjustDeckCardInput,
  CreateDeckInput,
  DeckRecord,
  DeckSourceMode,
  UpdateDeckMetadataInput,
} from "@/modules/deck/domain/deck-record";
import type { DeckRepository, OwnedQuantityLookupInput } from "@/modules/deck/domain/deck-repository";

function buildDeck(id: string): DeckRecord {
  const now = "2026-04-23T00:00:00.000Z";
  return {
    id,
    name: "Test Deck",
    slug: "test-deck",
    description: null,
    notes: null,
    preferredSource: "all",
    tags: [],
    cards: [],
    createdAt: now,
    updatedAt: now,
  };
}

class InMemoryDeckRepository implements DeckRepository {
  constructor(private deck: DeckRecord | null) {}

  async list(): Promise<DeckRecord[]> {
    return this.deck ? [this.deck] : [];
  }

  async getById(_deckId: string): Promise<DeckRecord | null> {
    void _deckId;
    return this.deck;
  }

  async create(input: CreateDeckInput): Promise<DeckRecord> {
    const created = {
      ...buildDeck("deck_created"),
      name: input.name,
      preferredSource: input.sourceMode ?? "all",
    };
    this.deck = created;
    return created;
  }

  async updateMetadata(_input: UpdateDeckMetadataInput): Promise<DeckRecord | null> {
    void _input;
    return this.deck;
  }

  async addCard(_input: AddDeckCardInput): Promise<DeckRecord | null> {
    void _input;
    return this.deck;
  }

  async adjustCard(_input: AdjustDeckCardInput): Promise<DeckRecord | null> {
    void _input;
    return this.deck;
  }

  async getOwnedQuantity(_input: OwnedQuantityLookupInput): Promise<number> {
    void _input;
    return 0;
  }

  async getPreferredSource(_deckId: string): Promise<DeckSourceMode | null> {
    void _deckId;
    return this.deck?.preferredSource ?? null;
  }
}

const throwingSourceProvider: DeckSuggestionSourceProvider = {
  async suggestByNeed() {
    throw new Error("upstream unavailable");
  },
};

const emptyComboDataSource: ComboDataSource = {
  async listKnownCombos() {
    return [];
  },
};

describe("DeckService intelligence fallback", () => {
  it("returns a created deck even when intelligence generation fails", async () => {
    const repository = new InMemoryDeckRepository(null);
    const service = new DeckService(repository, {
      sourceProvider: throwingSourceProvider,
      comboDataSource: emptyComboDataSource,
    });

    const payload = await service.create({ name: "Fresh Deck" });

    expect(payload.deck.id).toBe("deck_created");
    expect(payload.validation.cardCount).toBe(0);
    expect(payload.intelligence.recommendations).toHaveLength(0);
    expect(payload.intelligence.synergies).toHaveLength(0);
    expect(payload.intelligence.combos).toHaveLength(0);
  });

  it("loads an empty deck safely when intelligence generation fails", async () => {
    const repository = new InMemoryDeckRepository(buildDeck("deck_existing"));
    const service = new DeckService(repository, {
      sourceProvider: throwingSourceProvider,
      comboDataSource: emptyComboDataSource,
    });

    const payload = await service.getById("deck_existing");

    expect(payload).not.toBeNull();
    expect(payload?.deck.cards).toHaveLength(0);
    expect(payload?.validation.issues.some((issue) => issue.code === "missing_commander")).toBe(true);
    expect(payload?.intelligence.recommendations).toHaveLength(0);
  });
});
