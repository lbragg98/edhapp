import { describe, expect, it, vi } from "vitest";
import { normalizeLibrarySearchParams } from "@/modules/library/application/library-search-params";

describe("normalizeLibrarySearchParams", () => {
  it("normalizes malformed params and falls back to safe defaults", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const normalized = normalizeLibrarySearchParams(
      {
        query: "   \u200B   Weird   Input   ",
        colors: "W,Z,R",
        finish: "GLOSSY",
        condition: "MINT+",
        pageSize: "0",
      },
      "library_params_test",
    );

    expect(normalized.query).toBe("Weird Input");
    expect(normalized.colors).toEqual(["W", "R"]);
    expect(normalized.finish).toBeUndefined();
    expect(normalized.condition).toBeUndefined();
    expect(normalized.pageSize).toBe(1);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

