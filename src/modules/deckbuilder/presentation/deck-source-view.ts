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
  const meta = z
    .object({
      mode: z.enum(["all", "library"]),
      items: z.array(z.unknown()),
    })
    .parse(payload);

  const items = meta.items.flatMap((entry, index) => {
    const parsed = cardSelectionRecordViewSchema.safeParse(entry);
    if (parsed.success) {
      return [parsed.data];
    }

    console.warn("[Filters][deckbuilder-source] Skipped invalid source record.", {
      index,
      issues: parsed.error.issues,
    });
    return [];
  });

  return { mode: meta.mode, items };
}

export function parseDeckSourceResultResponse(payload: unknown, context: string) {
  const envelope = z.object({ data: z.unknown() }).safeParse(payload);
  if (!envelope.success) {
    console.warn("[Filters][deckbuilder-source] Invalid source API payload envelope.", {
      context,
      issues: envelope.error.issues,
    });
    return null;
  }

  const parsed = z
    .object({
      mode: z.enum(["all", "library"]),
      items: z.array(z.unknown()),
    })
    .safeParse(envelope.data.data);

  if (!parsed.success) {
    console.warn("[Filters][deckbuilder-source] Invalid source API payload data.", {
      context,
      issues: parsed.error.issues,
    });
    return null;
  }

  const items = parsed.data.items.flatMap((entry, index) => {
    const item = cardSelectionRecordViewSchema.safeParse(entry);
    if (item.success) {
      return [item.data];
    }

    console.warn("[Filters][deckbuilder-source] Skipped malformed source entry from API payload.", {
      context,
      index,
      issues: item.error.issues,
    });
    return [];
  });

  return { mode: parsed.data.mode, items };
}
