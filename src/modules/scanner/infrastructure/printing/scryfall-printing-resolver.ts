import type { ScannerPrintingOption, ScannerPrintingResolver } from "@/modules/scanner/domain/scanner-record";
import {
  scryfallCardSchema,
  scryfallSearchResponseSchema,
  scryfallErrorResponseSchema,
} from "@/modules/catalog/infrastructure/scryfall/schemas";

const SCRYFALL_API_BASE = "https://api.scryfall.com";

async function fetchScryfallJson<T>(url: string, schema: { parse: (input: unknown) => T }): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "CommandTower/0.1 (https://example.com)",
      Accept: "application/json",
    },
    next: {
      revalidate: 120,
    },
  });

  const json = (await response.json()) as unknown;

  if (!response.ok) {
    const parsedError = scryfallErrorResponseSchema.safeParse(json);

    if (parsedError.success) {
      throw new Error(parsedError.data.details);
    }

    throw new Error("Scryfall request failed");
  }

  return schema.parse(json);
}

function resolveImageUri(card: { image_uris?: { normal?: string } | null; card_faces?: { image_uris?: { normal?: string } | null }[] }): string | null {
  if (card.image_uris?.normal) {
    return card.image_uris.normal;
  }

  const firstFace = card.card_faces?.find((face) => face.image_uris?.normal);
  return firstFace?.image_uris?.normal ?? null;
}

/**
 * Scryfall-based implementation of the printing resolver.
 * Fetches all printings of a card by its Scryfall ID (any printing) or oracle ID.
 */
export class ScryfallPrintingResolver implements ScannerPrintingResolver {
  async resolvePrintings(cardId: string): Promise<ScannerPrintingOption[]> {
    // First, fetch the card to get its prints_search_uri
    const cardUrl = `${SCRYFALL_API_BASE}/cards/${cardId}`;
    const card = await fetchScryfallJson(cardUrl, scryfallCardSchema);

    if (!card.prints_search_uri) {
      // Fallback: return just this printing
      return [this.mapToPrintingOption(card)];
    }

    // Fetch all printings via the prints_search_uri
    const printingsUrl = `${card.prints_search_uri}&order=released&dir=desc&unique=prints`;
    const printingsResponse = await fetchScryfallJson(printingsUrl, scryfallSearchResponseSchema);

    return printingsResponse.data
      .filter((p) => p.finishes && p.finishes.length > 0)
      .slice(0, 50)
      .map((p) => this.mapToPrintingOption(p));
  }

  private mapToPrintingOption(card: {
    id: string;
    set?: string;
    set_name?: string;
    collector_number?: string;
    rarity?: string;
    released_at?: string | null;
    finishes?: string[];
    image_uris?: { normal?: string } | null;
    card_faces?: { image_uris?: { normal?: string } | null }[];
    prices?: { usd?: string | null; usd_foil?: string | null };
  }): ScannerPrintingOption {
    return {
      scryfallId: card.id,
      setCode: card.set?.toUpperCase() ?? "",
      setName: card.set_name ?? "",
      collectorNumber: card.collector_number ?? "",
      rarity: card.rarity ?? "",
      releasedAt: card.released_at ?? null,
      finishes: card.finishes ?? [],
      imageUri: resolveImageUri(card),
      price: card.prices
        ? {
            usd: card.prices.usd ?? null,
            usdFoil: card.prices.usd_foil ?? null,
          }
        : null,
    };
  }
}
