import { describe, expect, it } from "vitest";
import {
  normalizeBooleanParam,
  normalizeEnumParam,
  normalizeIntegerParam,
  normalizeSearchText,
} from "@/modules/search/application/search-normalization";

describe("search-normalization", () => {
  it("normalizes whitespace, unicode, and control characters", () => {
    const input = "  Ｔｅｓｔ\u0000\u200B   value 😀  ";
    const normalized = normalizeSearchText(input, { maxLength: 40, unicodeForm: "NFKC" });
    expect(normalized).toBe("Test value 😀");
  });

  it("caps by code point length and handles non-strings safely", () => {
    expect(normalizeSearchText("😀😀😀", { maxLength: 2, unicodeForm: "NFKC" })).toBe("😀😀");
    expect(normalizeSearchText(null, { maxLength: 10, unicodeForm: "NFKC" })).toBe("");
  });

  it("normalizes booleans, enums, and integers with safe fallbacks", () => {
    expect(normalizeBooleanParam("true", false)).toBe(true);
    expect(normalizeBooleanParam("weird", true)).toBe(true);

    expect(normalizeEnumParam("name", ["relevance", "name", "released"] as const, "relevance")).toBe("name");
    expect(normalizeEnumParam("not-valid", ["relevance", "name", "released"] as const, "relevance")).toBe("relevance");

    expect(normalizeIntegerParam("5000", { fallback: 10, min: 1, max: 60 })).toBe(60);
    expect(normalizeIntegerParam("-4", { fallback: 10, min: 1, max: 60 })).toBe(1);
    expect(normalizeIntegerParam("NaN", { fallback: 10, min: 1, max: 60 })).toBe(10);
  });
});

