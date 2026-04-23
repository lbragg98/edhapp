import {
  COLLECTION_CONDITIONS,
  COLLECTION_FINISHES,
  type CollectionCondition,
  type CollectionFinish,
} from "@/modules/library/domain/library-record";
import { parseCardColorCsv } from "@/modules/catalog/application/card-color-filter";
import {
  normalizeIntegerParam,
  normalizeOptionalSearchText,
} from "@/modules/search";

export type RawLibrarySearchParams = {
  query?: string | null | undefined;
  colors?: string | null | undefined;
  finish?: string | null | undefined;
  condition?: string | null | undefined;
  pageSize?: string | null | undefined;
};

export type NormalizedLibrarySearchParams = {
  query: string;
  colors: string[];
  finish: CollectionFinish | undefined;
  condition: CollectionCondition | undefined;
  pageSize: number;
};

export function normalizeLibrarySearchParams(
  raw: RawLibrarySearchParams,
  context: string,
): NormalizedLibrarySearchParams {
  const query = normalizeOptionalSearchText(raw.query, {
    maxLength: 120,
    unicodeForm: "NFKC",
  }) ?? "";
  const colors = parseCardColorCsv(raw.colors, context) ?? [];

  const finish = raw.finish && COLLECTION_FINISHES.includes(raw.finish as CollectionFinish)
    ? (raw.finish as CollectionFinish)
    : undefined;
  const condition = raw.condition && COLLECTION_CONDITIONS.includes(raw.condition as CollectionCondition)
    ? (raw.condition as CollectionCondition)
    : undefined;

  const pageSize = normalizeIntegerParam(raw.pageSize, {
    fallback: 24,
    min: 1,
    max: 60,
  });

  return { query, colors, finish, condition, pageSize };
}
