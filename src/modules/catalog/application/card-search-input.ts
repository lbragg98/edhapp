import { z } from "zod";
import {
  CARD_COLORS,
  CARD_POOLS,
  CARD_SORTS,
  type CardSearchInput,
  type NormalizedCardSearchInput,
} from "@/modules/catalog/domain/card-record";

const cardColorSchema = z.enum(CARD_COLORS);

export const cardSearchInputSchema = z.object({
  query: z.string().trim().max(120).optional(),
  colors: z.array(cardColorSchema).max(5).optional(),
  typeLine: z.string().trim().max(60).optional(),
  commanderOnly: z.boolean().optional(),
  pool: z.enum(CARD_POOLS).optional(),
  sort: z.enum(CARD_SORTS).optional(),
  page: z.number().int().min(1).max(200).optional(),
  pageSize: z.number().int().min(1).max(36).optional(),
});

export function normalizeCardSearchInput(input: CardSearchInput): NormalizedCardSearchInput {
  const parsed = cardSearchInputSchema.parse(input);

  return {
    query: parsed.query ?? "",
    colors: [...new Set(parsed.colors ?? [])],
    typeLine: parsed.typeLine ?? "",
    commanderOnly: parsed.commanderOnly ?? true,
    pool: parsed.pool ?? "all",
    sort: parsed.sort ?? "relevance",
    page: parsed.page ?? 1,
    pageSize: parsed.pageSize ?? 18,
  };
}
