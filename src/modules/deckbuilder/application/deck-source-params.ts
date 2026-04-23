import { parseCardColorCsv } from "@/modules/catalog/application/card-color-filter";
import { normalizeBooleanParam, normalizeIntegerParam, normalizeOptionalSearchText } from "@/modules/search";
import type { CardSelectionSource } from "@/modules/selection";

export type RawDeckSourceParams = {
  mode?: string | null | undefined;
  query?: string | null | undefined;
  colors?: string | string[] | null | undefined;
  typeLine?: string | null | undefined;
  commanderOnly?: string | null | undefined;
  limit?: string | null | undefined;
};

export type NormalizedDeckSourceParams = {
  mode: CardSelectionSource;
  query: string;
  colors: string[];
  typeLine: string;
  commanderOnly: boolean;
  limit: number;
};

export function normalizeDeckSourceParams(
  raw: RawDeckSourceParams,
  context: string,
): NormalizedDeckSourceParams {
  const mode: CardSelectionSource = raw.mode === "library" ? "library" : "all";
  const query = normalizeOptionalSearchText(raw.query, {
    maxLength: 120,
    unicodeForm: "NFKC",
  }) ?? "";
  const typeLine = normalizeOptionalSearchText(raw.typeLine, {
    maxLength: 60,
    unicodeForm: "NFKC",
  }) ?? "";
  const colors = Array.isArray(raw.colors)
    ? parseCardColorCsv(raw.colors.join(","), context) ?? []
    : parseCardColorCsv(raw.colors, context) ?? [];
  const commanderOnly = normalizeBooleanParam(raw.commanderOnly, false);
  const limit = normalizeIntegerParam(raw.limit, { fallback: 20, min: 1, max: 36 });

  return { mode, query, colors, typeLine, commanderOnly, limit };
}
