import { z } from "zod";
import type { CardDetailRecord } from "@/modules/catalog/domain/card-record";

const imageUrisViewSchema = z.object({
  normal: z.string().nullable(),
  artCrop: z.string().nullable(),
  borderCrop: z.string().nullable(),
});

const faceViewSchema = z.object({
  name: z.string(),
  manaCost: z.string().nullable(),
  typeLine: z.string(),
  oracleText: z.string().nullable(),
  imageUris: imageUrisViewSchema,
});

const cardRulingViewSchema = z.object({
  source: z.enum(["wotc", "scryfall"]),
  publishedAt: z.string(),
  comment: z.string(),
});

const cardPrintingViewSchema = z.object({
  id: z.string(),
  setCode: z.string(),
  setName: z.string(),
  collectorNumber: z.string(),
  rarity: z.string(),
  releasedAt: z.string().nullable(),
  finishes: z.array(z.string()),
  imageUris: imageUrisViewSchema,
  faces: z.array(faceViewSchema),
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

const cardDetailViewSchema = z.object({
  id: z.string(),
  oracleId: z.string(),
  name: z.string(),
  manaCost: z.string().nullable(),
  typeLine: z.string(),
  oracleText: z.string().nullable(),
  imageUri: z.string().nullable(),
  imageUris: imageUrisViewSchema,
  faces: z.array(faceViewSchema),
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
  legalities: z.record(z.string(), z.enum(["legal", "not_legal", "restricted", "banned"])),
  rulings: z.array(cardRulingViewSchema),
  printings: z.array(cardPrintingViewSchema),
});

export function toCardDetailView(card: CardDetailRecord) {
  return cardDetailViewSchema.parse(card);
}
