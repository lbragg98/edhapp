import { z } from "zod";
import type { DeckRecord } from "@/modules/deck/domain/deck-record";

export const deckCardViewSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  oracleId: z.string(),
  scryfallId: z.string(),
  printingId: z.string().nullable(),
  zone: z.enum(["commander", "mainboard"]),
  quantity: z.number(),
  name: z.string(),
  manaCost: z.string().nullable(),
  typeLine: z.string(),
  oracleText: z.string().nullable(),
  imageUri: z.string().nullable(),
  colorIdentity: z.array(z.string()),
  legalCommander: z.boolean(),
  note: z.string().nullable(),
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

export const deckViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  preferredSource: z.enum(["all", "library"]),
  tags: z.array(z.string()),
  cards: z.array(deckCardViewSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const deckListViewSchema = z.array(deckViewSchema);

export function toDeckView(deck: DeckRecord) {
  return deckViewSchema.parse(deck);
}

export function toDeckListView(decks: DeckRecord[]) {
  return deckListViewSchema.parse(decks);
}
