import {
  CARD_POOLS,
  CARD_SORTS,
  type CardColor,
  type CardPool,
  type CardSort,
} from "@/modules/catalog/domain/card-record";
import { parseCardColorCsv, parseCardColorsFromParam } from "@/modules/catalog/application/card-color-filter";
import {
  normalizeBooleanParam,
  normalizeEnumParam,
  normalizeIntegerParam,
  normalizeOptionalSearchText,
} from "@/modules/search";

export type RawCardSearchParams = {
  query?: string | string[] | null | undefined;
  colors?: string | string[] | null | undefined;
  typeLine?: string | string[] | null | undefined;
  commanderOnly?: string | string[] | null | undefined;
  pool?: string | string[] | null | undefined;
  sort?: string | string[] | null | undefined;
  page?: string | string[] | null | undefined;
  pageSize?: string | string[] | null | undefined;
};

export type NormalizedCardSearchParams = {
  query: string;
  colors: CardColor[];
  typeLine: string;
  commanderOnly: boolean;
  pool: CardPool;
  sort: CardSort;
  page: number;
  pageSize: number;
};

function firstParamValue(value: string | string[] | null | undefined): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    return typeof first === "string" ? first : undefined;
  }

  return undefined;
}

type NormalizeCardSearchParamOptions = {
  defaultPool?: CardPool;
  defaultSort?: CardSort;
  defaultCommanderOnly?: boolean;
  defaultPage?: number;
  defaultPageSize?: number;
};

export function normalizeCardSearchParams(
  raw: RawCardSearchParams,
  context: string,
  options?: NormalizeCardSearchParamOptions,
): NormalizedCardSearchParams {
  const query = normalizeOptionalSearchText(firstParamValue(raw.query), {
    maxLength: 120,
    unicodeForm: "NFKC",
  }) ?? "";
  const typeLine = normalizeOptionalSearchText(firstParamValue(raw.typeLine), {
    maxLength: 60,
    unicodeForm: "NFKC",
  }) ?? "";
  const pool = normalizeEnumParam(
    firstParamValue(raw.pool),
    CARD_POOLS,
    options?.defaultPool ?? "all",
  );
  const sort = normalizeEnumParam(
    firstParamValue(raw.sort),
    CARD_SORTS,
    options?.defaultSort ?? "relevance",
  );
  const commanderOnly = normalizeBooleanParam(
    firstParamValue(raw.commanderOnly),
    options?.defaultCommanderOnly ?? true,
  );
  const page = normalizeIntegerParam(firstParamValue(raw.page), {
    fallback: options?.defaultPage ?? 1,
    min: 1,
    max: 200,
  });
  const pageSize = normalizeIntegerParam(firstParamValue(raw.pageSize), {
    fallback: options?.defaultPageSize ?? 18,
    min: 1,
    max: 36,
  });

  const colorsInput = raw.colors;
  const colors = Array.isArray(colorsInput)
    ? parseCardColorsFromParam(colorsInput, context)
    : parseCardColorCsv(firstParamValue(colorsInput), context) ?? [];

  return {
    query,
    colors,
    typeLine,
    commanderOnly,
    pool,
    sort,
    page,
    pageSize,
  };
}
