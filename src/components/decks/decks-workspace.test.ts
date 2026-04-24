import { describe, expect, it } from "vitest";
import { insertDeckIntoList } from "@/components/decks/decks-workspace";
import type { DeckRecord } from "@/modules/deck";

function buildDeck(id: string, updatedAt: string): DeckRecord {
  return {
    id,
    name: `Deck ${id}`,
    slug: `deck-${id}`,
    description: null,
    notes: null,
    preferredSource: "all",
    tags: [],
    cards: [],
    createdAt: updatedAt,
    updatedAt,
  };
}

describe("insertDeckIntoList", () => {
  it("prepends newly created decks so UI updates immediately", () => {
    const older = buildDeck("deck_old", "2026-04-22T00:00:00.000Z");
    const created = buildDeck("deck_new", "2026-04-23T00:00:00.000Z");

    const result = insertDeckIntoList([older], created);

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("deck_new");
  });

  it("does not duplicate a deck when create response is replayed", () => {
    const existing = buildDeck("deck_1", "2026-04-23T00:00:00.000Z");

    const result = insertDeckIntoList([existing], existing);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("deck_1");
  });
});
