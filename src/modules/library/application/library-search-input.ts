import { z } from "zod";
import { CARD_COLORS } from "@/modules/catalog/domain/card-record";
import {
  COLLECTION_CONDITIONS,
  COLLECTION_FINISHES,
  type LibrarySearchInput,
  type NormalizedLibrarySearchInput,
} from "@/modules/library/domain/library-record";
import { normalizeSearchText } from "@/modules/search";

const colorSchema = z.enum(CARD_COLORS);

export const librarySearchInputSchema = z.object({
  query: z.string().trim().max(120).optional(),
  colors: z.array(colorSchema).max(5).optional(),
  finish: z.enum(COLLECTION_FINISHES).optional(),
  condition: z.enum(COLLECTION_CONDITIONS).optional(),
  pageSize: z.number().int().min(1).max(60).optional(),
});

export function normalizeLibrarySearchInput(input: LibrarySearchInput): NormalizedLibrarySearchInput {
  const parsed = librarySearchInputSchema.parse(input);

  return {
    query: parsed.query
      ? normalizeSearchText(parsed.query, { maxLength: 120, unicodeForm: "NFKC" })
      : "",
    colors: [...new Set(parsed.colors ?? [])],
    finish: parsed.finish ?? null,
    condition: parsed.condition ?? null,
    pageSize: parsed.pageSize ?? 24,
  };
}
