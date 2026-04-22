import { describe, expect, it, vi } from "vitest";
import { parseCardSearchResultResponse } from "@/modules/catalog/presentation/card-search-result-view";

describe("parseCardSearchResultResponse", () => {
  it("keeps valid records and skips malformed ones", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const payload = {
      data: {
        hasMore: false,
        nextPage: null,
        total: 2,
        items: [
          {
            id: "card_1",
            oracleId: "oracle_1",
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
          {
            id: "card_2",
            oracleId: "oracle_2",
            name: "Broken Card",
            manaCost: null,
            oracleText: null,
            imageUri: null,
            colorIdentity: [],
            cmc: 1,
            legalCommander: true,
            price: null,
          },
        ],
      },
    };

    const result = parseCardSearchResultResponse(payload, "test_case");

    expect(result).not.toBeNull();
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]?.name).toBe("Arcane Signet");
    expect(warn).toHaveBeenCalledTimes(1);

    warn.mockRestore();
  });
});
