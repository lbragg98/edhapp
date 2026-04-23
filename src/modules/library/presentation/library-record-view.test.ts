import { describe, expect, it, vi } from "vitest";
import { parseLibraryRecordListResponse } from "@/modules/library/presentation/library-record-view";

describe("parseLibraryRecordListResponse", () => {
  it("keeps valid records and skips malformed records", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const payload = {
      data: [
        {
          holdingId: "holding_1",
          entryId: "entry_1",
          cardId: "card_1",
          oracleId: "oracle_1",
          printingId: null,
          scryfallId: "scryfall_1",
          name: "Arcane Signet",
          manaCost: "{2}",
          typeLine: "Artifact",
          imageUri: null,
          colorIdentity: [],
          setCode: "CMM",
          setName: "Commander Masters",
          collectorNumber: "123",
          finish: "NONFOIL",
          condition: "NM",
          quantity: 1,
          note: null,
          price: null,
        },
        {
          holdingId: "holding_2",
          entryId: "entry_2",
          cardId: "card_2",
          oracleId: "oracle_2",
          printingId: null,
          scryfallId: "scryfall_2",
          name: "Malformed",
          manaCost: null,
          imageUri: null,
        },
      ],
    };

    const parsed = parseLibraryRecordListResponse(payload, "library_response_test");

    expect(parsed).not.toBeNull();
    expect(parsed).toHaveLength(1);
    expect(parsed?.[0]?.name).toBe("Arcane Signet");
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

