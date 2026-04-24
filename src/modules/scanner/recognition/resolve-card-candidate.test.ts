import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => ({
  prisma: undefined,
}));

import { resolveCardCandidate } from "@/modules/scanner/recognition/resolve-card-candidate";

function createFuzzyCardResponse(name: string) {
  return {
    id: "card-1",
    oracle_id: "oracle-1",
    name,
    mana_cost: "{3}{R}{R}",
    type_line: "Sorcery",
    oracle_text: "Add {R} for each tapped land your opponents control.",
    color_identity: ["R"],
    cmc: 5,
    legalities: {
      commander: "legal",
    },
    image_uris: {
      normal: "https://cards.scryfall.io/normal/front/example.jpg",
      art_crop: "https://cards.scryfall.io/art_crop/front/example.jpg",
    },
  };
}

describe("resolveCardCandidate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns high-confidence candidate from Scryfall fuzzy fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify(createFuzzyCardResponse("Mana Geyser")), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );

    const result = await resolveCardCandidate({
      extractedText: "Mana Geyser",
      extractionConfidence: 0.9,
    });

    expect(result.status).toBe("high-confidence");
    expect(result.candidates[0]?.card.name).toBe("Mana Geyser");
    expect(result.candidates[0]?.confidence).toBeGreaterThan(0.8);
  });
});

