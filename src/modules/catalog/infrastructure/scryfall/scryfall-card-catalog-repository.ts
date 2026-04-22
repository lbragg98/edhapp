import type {
  CardCatalogRepository,
} from "@/modules/catalog/domain/card-catalog-repository";
import type {
  CardDetailRecord,
  CardRulingRecord,
  CardPrintingRecord,
  CardSearchResult,
  NormalizedCardSearchInput,
} from "@/modules/catalog/domain/card-record";
import {
  mapScryfallCardToDetail,
  mapScryfallCardToListItem,
  mapScryfallCardToPrinting,
} from "@/modules/catalog/infrastructure/scryfall/mapper";
import { fetchScryfallRulings } from "@/modules/catalog/infrastructure/scryfall/fetch-rulings";
import {
  scryfallCardSchema,
  scryfallErrorResponseSchema,
  scryfallSearchResponseSchema,
} from "@/modules/catalog/infrastructure/scryfall/schemas";

const SCRYFALL_API_BASE = "https://api.scryfall.com";

function buildSearchExpression(input: NormalizedCardSearchInput): string {
  const terms: string[] = ["game:paper"];

  if (input.query) {
    terms.push(input.query);
  }

  if (input.commanderOnly) {
    terms.push("legal:commander");
  }

  if (input.typeLine) {
    terms.push(`t:${input.typeLine}`);
  }

  if (input.colors.length > 0) {
    terms.push(`id>=${input.colors.join("").toLowerCase()}`);
  }

  return terms.join(" ");
}

function searchOrder(sort: NormalizedCardSearchInput["sort"]): string {
  if (sort === "name") {
    return "name";
  }

  if (sort === "released") {
    return "released";
  }

  return "cmc";
}

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

export class ScryfallCardCatalogRepository implements CardCatalogRepository {
  async search(input: NormalizedCardSearchInput): Promise<CardSearchResult> {
    const url = new URL(`${SCRYFALL_API_BASE}/cards/search`);
    url.searchParams.set("q", buildSearchExpression(input));
    url.searchParams.set("unique", "cards");
    url.searchParams.set("order", searchOrder(input.sort));
    url.searchParams.set("dir", "auto");
    url.searchParams.set("include_extras", "false");
    url.searchParams.set("include_multilingual", "false");
    url.searchParams.set("page", String(input.page));

    const parsed = await fetchScryfallJson(url.toString(), scryfallSearchResponseSchema);

    return {
      items: parsed.data.slice(0, input.pageSize).map(mapScryfallCardToListItem),
      hasMore: parsed.has_more,
      nextPage: parsed.has_more ? input.page + 1 : null,
      total: parsed.total_cards ?? null,
    };
  }

  async getById(cardId: string): Promise<CardDetailRecord | null> {
    const cardUrl = `${SCRYFALL_API_BASE}/cards/${cardId}`;

    const card = await fetchScryfallJson(cardUrl, scryfallCardSchema);

    let printings: CardPrintingRecord[] = [];
    let rulings: CardRulingRecord[] = [];

    if (card.prints_search_uri) {
      const printingsResponse = await fetchScryfallJson(
        `${card.prints_search_uri}&order=released&dir=desc&unique=prints`,
        scryfallSearchResponseSchema,
      );
      printings = printingsResponse.data.slice(0, 24).map(mapScryfallCardToPrinting);
    }

    if (card.rulings_uri) {
      try {
        rulings = (await fetchScryfallRulings(card.id)).slice(0, 48);
      } catch {
        rulings = [];
      }
    }

    return mapScryfallCardToDetail(card, printings, rulings);
  }
}
