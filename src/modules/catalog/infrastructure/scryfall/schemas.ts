import { z } from "zod";

const scryfallLegalitySchema = z.enum(["legal", "not_legal", "restricted", "banned"]);

const imageUrisSchema = z
  .object({
    normal: z.string().url().optional(),
    art_crop: z.string().url().optional(),
    border_crop: z.string().url().optional(),
  })
  .nullable()
  .optional();

const cardFaceSchema = z.object({
  name: z.string().optional(),
  mana_cost: z.string().nullable().optional(),
  type_line: z.string().optional(),
  oracle_text: z.string().nullable().optional(),
  image_uris: imageUrisSchema,
});

const pricesSchema = z.object({
  usd: z.string().nullable().optional(),
  usd_foil: z.string().nullable().optional(),
  usd_etched: z.string().nullable().optional(),
  eur: z.string().nullable().optional(),
  eur_foil: z.string().nullable().optional(),
  tix: z.string().nullable().optional(),
});

export const scryfallCardSchema = z.object({
  id: z.string(),
  oracle_id: z.string().nullable().optional(),
  name: z.string(),
  mana_cost: z.string().nullable().optional(),
  type_line: z.string(),
  layout: z.string().optional(),
  oracle_text: z.string().nullable().optional(),
  color_identity: z.array(z.string()),
  cmc: z.number(),
  legalities: z.record(z.string(), scryfallLegalitySchema),
  image_uris: imageUrisSchema,
  card_faces: z.array(cardFaceSchema).optional(),
  prints_search_uri: z.string().url().optional(),
  rulings_uri: z.string().url().optional(),
  set: z.string().optional(),
  set_name: z.string().optional(),
  collector_number: z.string().optional(),
  rarity: z.string().optional(),
  released_at: z.string().nullable().optional(),
  finishes: z.array(z.string()).optional(),
  prices: pricesSchema.optional(),
});

export const scryfallRulingSchema = z.object({
  source: z.enum(["wotc", "scryfall"]),
  published_at: z.string(),
  comment: z.string(),
});

export const scryfallRulingsResponseSchema = z.object({
  data: z.array(scryfallRulingSchema),
});

export const scryfallSearchResponseSchema = z.object({
  data: z.array(scryfallCardSchema),
  has_more: z.boolean(),
  total_cards: z.number().optional(),
  next_page: z.string().url().optional(),
});

export const scryfallErrorResponseSchema = z.object({
  object: z.literal("error"),
  code: z.string(),
  details: z.string(),
});
