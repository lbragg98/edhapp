import { describe, expect, it } from "vitest";
import { normalizeDeckSourceParams } from "@/modules/deckbuilder/application/deck-source-params";

describe("normalizeDeckSourceParams", () => {
  it("normalizes invalid source params safely", () => {
    const normalized = normalizeDeckSourceParams(
      {
        mode: "unexpected",
        query: "  \u0000 Sol Ring   ",
        typeLine: " Artifact ",
        colors: ["W,U", "x"],
        commanderOnly: "not-boolean",
        limit: "999",
      },
      "deck_source_params_test",
    );

    expect(normalized.mode).toBe("all");
    expect(normalized.query).toBe("Sol Ring");
    expect(normalized.typeLine).toBe("Artifact");
    expect(normalized.colors).toEqual(["W", "U"]);
    expect(normalized.commanderOnly).toBe(false);
    expect(normalized.limit).toBe(36);
  });
});

