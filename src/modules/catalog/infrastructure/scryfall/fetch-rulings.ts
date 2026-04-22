import type { CardRulingRecord } from "@/modules/catalog/domain/card-record";
import {
  scryfallErrorResponseSchema,
  scryfallRulingsResponseSchema,
} from "@/modules/catalog/infrastructure/scryfall/schemas";

const SCRYFALL_API_BASE = "https://api.scryfall.com";

export async function fetchScryfallRulings(cardId: string): Promise<CardRulingRecord[]> {
  const response = await fetch(`${SCRYFALL_API_BASE}/cards/${cardId}/rulings`, {
    headers: {
      "User-Agent": "CommandTower/0.1 (https://example.com)",
      Accept: "application/json",
    },
    next: {
      revalidate: 600,
    },
  });

  const json = (await response.json()) as unknown;

  if (!response.ok) {
    const parsed = scryfallErrorResponseSchema.safeParse(json);

    if (parsed.success) {
      return [];
    }

    throw new Error("Scryfall rulings request failed");
  }

  const parsed = scryfallRulingsResponseSchema.parse(json);

  return parsed.data.map((entry) => ({
    source: entry.source,
    publishedAt: entry.published_at,
    comment: entry.comment,
  }));
}

