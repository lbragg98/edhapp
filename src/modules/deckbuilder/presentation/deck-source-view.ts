import { z } from "zod";
import type { CardSelectionRecord } from "@/modules/selection";

export const cardSelectionRecordViewSchema: z.ZodType<CardSelectionRecord> = z.object({
  source: z.enum(["all", "library"]),
  sourceItemId: z.string(),
  cardId: z.string(),
  printingId: z.string().nullable(),
  scryfallId: z.string(),
  title: z.string(),
  subtitle: z.string(),
  manaCost: z.string().nullable(),
  imageUri: z.string().nullable(),
  colorIdentity: z.array(z.string()),
  availableQuantity: z.number().nullable(),
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

export const deckSourceResultViewSchema = z.object({
  mode: z.enum(["all", "library"]),
  items: z.array(cardSelectionRecordViewSchema),
});

export function toDeckSourceResultView(payload: unknown) {
  return deckSourceResultViewSchema.parse(payload);
}
