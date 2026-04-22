import { describe, expect, it } from "vitest";
import { normalizeCardSearchInput } from "@/modules/catalog/application/card-search-input";

describe("normalizeCardSearchInput", () => {
  it("applies defaults", () => {
    expect(normalizeCardSearchInput({})).toEqual({
      query: "",
      colors: [],
      typeLine: "",
      commanderOnly: true,
      pool: "all",
      sort: "relevance",
      page: 1,
      pageSize: 18,
    });
  });

  it("deduplicates colors", () => {
    expect(
      normalizeCardSearchInput({
        colors: ["W", "W", "U"],
        commanderOnly: false,
        pool: "library",
      }),
    ).toMatchObject({
      colors: ["W", "U"],
      commanderOnly: false,
      pool: "library",
    });
  });
});
