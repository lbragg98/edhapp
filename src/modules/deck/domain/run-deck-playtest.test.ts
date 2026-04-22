import { describe, expect, it } from "vitest";
import { runDeckPlaytest } from "@/modules/deck/domain/run-deck-playtest";
import type { DeckRecord } from "@/modules/deck/domain/deck-record";

function buildDeck(): DeckRecord {
  return {
    id: "d1",
    name: "Test Deck",
    slug: "test-deck",
    description: null,
    notes: null,
    preferredSource: "all",
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cards: [
      {
        id: "c-cmdr",
        cardId: "oracle-cmdr",
        oracleId: "oracle-cmdr",
        scryfallId: "s-cmdr",
        printingId: null,
        zone: "commander",
        quantity: 1,
        name: "Test Commander",
        manaCost: "{4}{G}{U}",
        typeLine: "Legendary Creature — Test",
        oracleText: null,
        imageUri: null,
        colorIdentity: ["G", "U"],
        legalCommander: true,
        note: null,
        price: null,
      },
      {
        id: "c-land",
        cardId: "oracle-land",
        oracleId: "oracle-land",
        scryfallId: "s-land",
        printingId: null,
        zone: "mainboard",
        quantity: 36,
        name: "Basic Land",
        manaCost: null,
        typeLine: "Basic Land",
        oracleText: null,
        imageUri: null,
        colorIdentity: [],
        legalCommander: true,
        note: null,
        price: null,
      },
      {
        id: "c-ramp",
        cardId: "oracle-ramp",
        oracleId: "oracle-ramp",
        scryfallId: "s-ramp",
        printingId: null,
        zone: "mainboard",
        quantity: 10,
        name: "Ramp Spell",
        manaCost: "{2}",
        typeLine: "Sorcery",
        oracleText: "Search your library for a land card.",
        imageUri: null,
        colorIdentity: ["G"],
        legalCommander: true,
        note: null,
        price: null,
      },
      {
        id: "c-spell",
        cardId: "oracle-spell",
        oracleId: "oracle-spell",
        scryfallId: "s-spell",
        printingId: null,
        zone: "mainboard",
        quantity: 53,
        name: "Value Spell",
        manaCost: "{3}",
        typeLine: "Sorcery",
        oracleText: "Draw a card.",
        imageUri: null,
        colorIdentity: ["U"],
        legalCommander: true,
        note: null,
        price: null,
      },
    ],
  };
}

describe("runDeckPlaytest", () => {
  it("returns aggregate metrics in expected ranges", () => {
    const report = runDeckPlaytest(buildDeck(), { runs: 120, turns: 7 });

    expect(report.runs).toBe(120);
    expect(report.turns).toBe(7);
    expect(report.averageLandsByTurn).toHaveLength(7);
    expect(report.keepableHandRate).toBeGreaterThanOrEqual(0);
    expect(report.keepableHandRate).toBeLessThanOrEqual(1);
    expect(report.manaScrewRate).toBeGreaterThanOrEqual(0);
    expect(report.manaFloodRate).toBeGreaterThanOrEqual(0);
    expect(report.commanderCastRate).toBeGreaterThanOrEqual(0);
  });
});

