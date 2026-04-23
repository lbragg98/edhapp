import { describe, expect, it, vi } from "vitest";
import { normalizeCardSearchParams } from "@/modules/catalog/application/card-search-params";

describe("normalizeCardSearchParams", () => {
  it("falls back safely for malformed query params", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const normalized = normalizeCardSearchParams(
      {
        query: "  A@@@   test   query  ",
        typeLine: "  Creature   ",
        commanderOnly: "definitely",
        sort: "invalid-sort",
        pool: "broken-pool",
        page: "-99",
        pageSize: "9999",
        colors: "W,X,G",
      },
      "card_params_test",
    );

    expect(normalized).toEqual({
      query: "A@@@ test query",
      typeLine: "Creature",
      commanderOnly: true,
      sort: "relevance",
      pool: "all",
      page: 1,
      pageSize: 36,
      colors: ["W", "G"],
    });
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("handles repeated params and extreme lengths without crashing", () => {
    const longQuery = "🔥".repeat(500);
    const normalized = normalizeCardSearchParams(
      {
        query: [longQuery, "ignored"],
        colors: ["W,U", "B"],
        page: "2",
        pageSize: "18",
      },
      "card_params_test",
    );

    expect(Array.from(normalized.query)).toHaveLength(120);
    expect(normalized.colors).toEqual(["W", "U", "B"]);
    expect(normalized.page).toBe(2);
    expect(normalized.pageSize).toBe(18);
  });
});

