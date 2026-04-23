import { describe, expect, it, vi } from "vitest";
import { parseCardColorCsv, parseCardColorsFromParam } from "@/modules/catalog/application/card-color-filter";

describe("card-color-filter", () => {
  it("drops invalid color values and keeps valid values", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(parseCardColorCsv("W,U,X,R,,R", "test_case")).toEqual(["W", "U", "R"]);
    expect(warn).toHaveBeenCalledTimes(1);

    warn.mockRestore();
  });

  it("handles array and missing param inputs safely", () => {
    expect(parseCardColorsFromParam(undefined, "test_case")).toEqual([]);
    expect(parseCardColorsFromParam(["W"], "test_case")).toEqual(["W"]);
    expect(parseCardColorsFromParam(["W", "X", "G"], "test_case")).toEqual(["W", "G"]);
  });
});
