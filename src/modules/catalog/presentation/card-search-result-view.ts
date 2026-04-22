import { z } from "zod";
import type { CardSearchResult } from "@/modules/catalog/domain/card-record";

export const cardListItemViewSchema = z.object({
  id: z.string(),
  oracleId: z.string(),
  name: z.string(),
  manaCost: z.string().nullable(),
  typeLine: z.string(),
  oracleText: z.string().nullable(),
  imageUri: z.string().nullable(),
  colorIdentity: z.array(z.string()),
  cmc: z.number(),
  legalCommander: z.boolean(),
  price: z
    .object({
      source: z.literal("scryfall"),
      capturedAt: z.string().nullable(),
      usd: z.number().nullable(),
      usdFoil: z.number().nullable(),
      usdEtched: z.number().nullable(),
      eur: z.number().nullable(),
      eurFoil: z.number().nullable(),
      tix: z.number().nullable(),
    })
    .nullable(),
});

const cardSearchResultMetaSchema = z.object({
  items: z.array(z.unknown()),
  hasMore: z.boolean(),
  nextPage: z.number().nullable(),
  total: z.number().nullable(),
});

export const cardSearchResultViewSchema = z.object({
  items: z.array(cardListItemViewSchema),
  hasMore: z.boolean(),
  nextPage: z.number().nullable(),
  total: z.number().nullable(),
});

export function toCardSearchResultView(result: CardSearchResult) {
  const meta = cardSearchResultMetaSchema.parse(result);
  const items = meta.items.flatMap((entry, index) => {
    const parsed = cardListItemViewSchema.safeParse(entry);
    if (parsed.success) {
      return [parsed.data];
    }

    console.warn("[Filters][cards] Skipped invalid card result record.", {
      index,
      issues: parsed.error.issues,
    });
    return [];
  });

  return {
    items,
    hasMore: meta.hasMore,
    nextPage: meta.nextPage,
    total: meta.total,
  };
}

export function parseCardSearchResultResponse(
  payload: unknown,
  context: string,
): CardSearchResult | null {
  const parsedPayload = z.object({ data: z.unknown() }).safeParse(payload);
  if (!parsedPayload.success) {
    console.warn("[Filters][cards] Invalid cards API payload envelope.", {
      context,
      issues: parsedPayload.error.issues,
    });
    return null;
  }

  const parsedData = cardSearchResultMetaSchema.safeParse(parsedPayload.data.data);
  if (!parsedData.success) {
    console.warn("[Filters][cards] Invalid cards API payload data.", {
      context,
      issues: parsedData.error.issues,
    });
    return null;
  }

  const items = parsedData.data.items.flatMap((entry, index) => {
    const item = cardListItemViewSchema.safeParse(entry);
    if (item.success) {
      return [item.data];
    }

    console.warn("[Filters][cards] Skipped malformed card entry from API payload.", {
      context,
      index,
      issues: item.error.issues,
    });
    return [];
  });

  return {
    items,
    hasMore: parsedData.data.hasMore,
    nextPage: parsedData.data.nextPage,
    total: parsedData.data.total,
  };
}
