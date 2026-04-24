import { describe, expect, it } from "vitest";
import { matchScanCandidates } from "@/modules/scanner/application/match-scan-candidates";

describe("matchScanCandidates", () => {
  it("ranks candidates by overlap with extracted OCR text", async () => {
    const searchCardsService = {
      async execute() {
        return {
          items: [
            {
              id: "1",
              oracleId: "o1",
              name: "Sol Ring",
              manaCost: "{1}",
              typeLine: "Artifact",
              oracleText: "{T}: Add {C}{C}.",
              imageUri: null,
              colorIdentity: [],
              cmc: 1,
              legalCommander: true,
              price: null,
            },
            {
              id: "2",
              oracleId: "o2",
              name: "Cultivate",
              manaCost: "{2}{G}",
              typeLine: "Sorcery",
              oracleText: "Search your library for up to two basic land cards.",
              imageUri: null,
              colorIdentity: ["G"],
              cmc: 3,
              legalCommander: true,
              price: null,
            },
          ],
          hasMore: false,
          nextPage: null,
          total: 2,
        };
      },
    };

    const result = await matchScanCandidates({
      extractedText: "Sol Ring Artifact",
      extractionConfidence: 0.72,
      searchCardsService,
    });

    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0]!.card.name).toBe("Sol Ring");
    expect(result[0]!.confidence).toBeGreaterThan(result[1]!.confidence);
  });

  it("keeps low-confidence scans explicit so UI can show manual confirmation fallback", async () => {
    const searchCardsService = {
      async execute() {
        return {
          items: [
            {
              id: "1",
              oracleId: "o1",
              name: "Arcane Signet",
              manaCost: "{2}",
              typeLine: "Artifact",
              oracleText: "{T}: Add one mana of any color in your commander's color identity.",
              imageUri: null,
              colorIdentity: [],
              cmc: 2,
              legalCommander: true,
              price: null,
            },
          ],
          hasMore: false,
          nextPage: null,
          total: 1,
        };
      },
    };

    const result = await matchScanCandidates({
      extractedText: "??? signtet blurry photo",
      extractionConfidence: 0.2,
      searchCardsService,
    });

    expect(result.length).toBe(1);
    expect(result[0]?.confidence).toBeLessThan(0.62);
    expect(result[0]?.reasons).toContain("Low OCR confidence; verify before confirming");
  });
});
