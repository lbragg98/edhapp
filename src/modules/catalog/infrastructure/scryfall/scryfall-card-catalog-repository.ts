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
  mapScryfallRawCardToDetail,
  mapScryfallRawCardToListItem,
  mapScryfallRawCardToPrinting,
} from "@/modules/catalog/infrastructure/scryfall/mapper";
import { fetchScryfallRulings } from "@/modules/catalog/infrastructure/scryfall/fetch-rulings";
import {
  scryfallErrorResponseSchema,
  scryfallRawCardSchema,
  scryfallRawSearchResponseSchema,
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

    const parsed = await fetchScryfallJson(url.toString(), scryfallRawSearchResponseSchema);
    const items: CardSearchResult["items"] = [];
    const skipped: Array<{ id?: string; reason: string }> = [];

    for (const raw of parsed.data) {
      const mapped = mapScryfallRawCardToListItem(raw);
      if (!mapped.item) {
        const maybeId = typeof raw === "object" && raw && "id" in raw && typeof (raw as { id?: unknown }).id === "string"
          ? (raw as { id: string }).id
          : undefined;
        skipped.push({
          ...(maybeId ? { id: maybeId } : {}),
          reason: mapped.issues.map((issue) => `${issue.code}:${issue.message}`).join("; "),
        });
        continue;
      }

      items.push(mapped.item);
      if (items.length >= input.pageSize) {
        break;
      }
    }

    if (skipped.length > 0) {
      console.warn("[ScryfallCatalog] Skipped invalid search card records", {
        skippedCount: skipped.length,
        sample: skipped.slice(0, 5),
      });
    }

    return {
      items,
      hasMore: parsed.has_more,
      nextPage: parsed.has_more ? input.page + 1 : null,
      total: parsed.total_cards ?? null,
    };
  }

  async getById(cardId: string): Promise<CardDetailRecord | null> {
    const cardUrl = `${SCRYFALL_API_BASE}/cards/${cardId}`;

    const card = await fetchScryfallJson(cardUrl, scryfallRawCardSchema);

    const printings: CardPrintingRecord[] = [];
    let rulings: CardRulingRecord[] = [];

    if (card.prints_search_uri) {
      const printingsResponse = await fetchScryfallJson(
        `${card.prints_search_uri}&order=released&dir=desc&unique=prints`,
        scryfallRawSearchResponseSchema,
      );
      const skippedPrintings: Array<{ id?: string; reason: string }> = [];
      for (const rawPrinting of printingsResponse.data) {
        const mappedPrinting = mapScryfallRawCardToPrinting(rawPrinting);
        if (!mappedPrinting.printing) {
          const maybeId = typeof rawPrinting === "object" && rawPrinting && "id" in rawPrinting && typeof (rawPrinting as { id?: unknown }).id === "string"
            ? (rawPrinting as { id: string }).id
            : undefined;
          skippedPrintings.push({
            ...(maybeId ? { id: maybeId } : {}),
            reason: mappedPrinting.issues.map((issue) => `${issue.code}:${issue.message}`).join("; "),
          });
          continue;
        }

        printings.push(mappedPrinting.printing);
        if (printings.length >= 24) {
          break;
        }
      }

      if (skippedPrintings.length > 0) {
        console.warn("[ScryfallCatalog] Skipped invalid printing records", {
          cardId,
          skippedCount: skippedPrintings.length,
          sample: skippedPrintings.slice(0, 5),
        });
      }
    }

    if (card.rulings_uri && card.id) {
      try {
        rulings = (await fetchScryfallRulings(card.id)).slice(0, 48);
      } catch {
        rulings = [];
      }
    }

    const detail = mapScryfallRawCardToDetail(card, printings, rulings);
    if (!detail.detail) {
      console.warn("[ScryfallCatalog] Card detail unusable after normalization", {
        cardId,
        issues: detail.issues,
      });
      return null;
    }

    return detail.detail;
  }
}
