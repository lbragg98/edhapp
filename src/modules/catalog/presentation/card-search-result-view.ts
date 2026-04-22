import { z } from "zod";
import type { CardSearchResult } from "@/modules/catalog/domain/card-record";

const cardListItemViewSchema = z.object({
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

const cardSearchResultViewSchema = z.object({
  items: z.array(cardListItemViewSchema),
  hasMore: z.boolean(),
  nextPage: z.number().nullable(),
  total: z.number().nullable(),
});

export function toCardSearchResultView(result: CardSearchResult) {
  return cardSearchResultViewSchema.parse(result);
}
