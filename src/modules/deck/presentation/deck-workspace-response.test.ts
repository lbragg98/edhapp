import { describe, expect, it, vi } from "vitest";
import { parseDeckListResponse, parseDeckWorkspaceResponse } from "@/modules/deck/presentation/deck-workspace-response";

function buildWorkspaceEnvelope() {
  return {
    data: {
      deck: {
        id: "deck_1",
        name: "Empty Deck",
        slug: "empty-deck",
        description: null,
        notes: null,
        preferredSource: "all",
        tags: [],
        cards: [],
        createdAt: "2026-04-23T00:00:00.000Z",
        updatedAt: "2026-04-23T00:00:00.000Z",
      },
      validation: {
        isValid: false,
        cardCount: 0,
        commanderColorIdentity: [],
        issues: [{ code: "missing_commander", message: "Select a commander." }],
      },
      analytics: {
        totalCards: 0,
        mainboardCards: 0,
        manaCurve: [
          { label: "0", count: 0 },
          { label: "1", count: 0 },
          { label: "2", count: 0 },
          { label: "3", count: 0 },
          { label: "4", count: 0 },
          { label: "5", count: 0 },
          { label: "6+", count: 0 },
        ],
        landCount: 0,
        colorIdentityBalance: [
          { color: "W", count: 0, ratio: 0 },
          { color: "U", count: 0, ratio: 0 },
          { color: "B", count: 0, ratio: 0 },
          { color: "R", count: 0, ratio: 0 },
          { color: "G", count: 0, ratio: 0 },
        ],
        cardTypeDistribution: [
          { type: "Land", count: 0, ratio: 0 },
          { type: "Creature", count: 0, ratio: 0 },
          { type: "Instant", count: 0, ratio: 0 },
          { type: "Sorcery", count: 0, ratio: 0 },
          { type: "Artifact", count: 0, ratio: 0 },
          { type: "Enchantment", count: 0, ratio: 0 },
          { type: "Planeswalker", count: 0, ratio: 0 },
          { type: "Battle", count: 0, ratio: 0 },
          { type: "Other", count: 0, ratio: 0 },
        ],
        rampDensity: { count: 0, ratio: 0 },
        drawDensity: { count: 0, ratio: 0 },
        spotRemovalDensity: { count: 0, ratio: 0 },
        boardWipeDensity: { count: 0, ratio: 0 },
        recursionDensity: { count: 0, ratio: 0 },
        protectionDensity: { count: 0, ratio: 0 },
        winConditionDensity: { count: 0, ratio: 0 },
        healthIndicators: [],
        warnings: [],
      },
      intelligence: {
        sourceMode: "all",
        generatedAt: "2026-04-23T00:00:00.000Z",
        recommendations: [],
        synergies: [],
        combos: [
          {
            id: "combo_1",
            source: "seed",
            label: "A + B",
            description: "Example",
            status: "partial",
            pieces: [{ name: "Piece A", present: false }],
            missingCount: 1,
          },
        ],
        extensionPoints: {
          playtestSimulationHook: "deck_intelligence_v1",
          budgetAwareUpgradeHook: "pricing_overlay_v1",
        },
      },
    },
  };
}

describe("deck workspace response parsing", () => {
  it("parses an empty deck workspace payload without throwing", () => {
    const payload = parseDeckWorkspaceResponse(buildWorkspaceEnvelope(), "test_empty_deck");

    expect(payload).not.toBeNull();
    expect(payload?.deck.cards).toHaveLength(0);
    expect(payload?.validation.issues[0]?.code).toBe("missing_commander");
    expect(payload?.intelligence.combos[0]?.pieces[0]?.cardId).toBeUndefined();
  });

  it("returns null and logs when workspace payload is invalid", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const payload = parseDeckWorkspaceResponse({ data: { deck: { id: "broken" } } }, "test_invalid");

    expect(payload).toBeNull();
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it("parses deck list payloads and rejects malformed envelopes", () => {
    const parsed = parseDeckListResponse({ data: [buildWorkspaceEnvelope().data.deck] }, "test_list");
    const malformed = parseDeckListResponse({ nope: [] }, "test_list_invalid");

    expect(parsed).toHaveLength(1);
    expect(malformed).toBeNull();
  });
});
