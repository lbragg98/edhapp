import type { DeckSourceQuery, DeckSourceResult } from "@/modules/deckbuilder/domain/deck-source";
import { createSearchCardsService, toCardSelectionItems } from "@/modules/catalog";
import { createListLibraryCardsService, toLibrarySelectionItems } from "@/modules/library";
import type { SearchCardsService } from "@/modules/catalog";
import type { ListLibraryCardsService } from "@/modules/library";
import { normalizeDeckSourceParams } from "@/modules/deckbuilder/application/deck-source-params";

export class DeckSourceService {
  private readonly cardService: SearchCardsService;

  private readonly libraryService: ListLibraryCardsService | null;

  constructor(userId?: string) {
    this.cardService = createSearchCardsService(userId);
    this.libraryService = userId ? createListLibraryCardsService(userId) : null;
  }

  async execute(input: DeckSourceQuery): Promise<DeckSourceResult> {
    const normalized = normalizeDeckSourceParams(
      {
        mode: input.mode,
        query: input.query ?? null,
        colors: input.colors ?? null,
        typeLine: input.typeLine ?? null,
        commanderOnly: input.commanderOnly === undefined ? null : String(input.commanderOnly),
        limit: input.limit === undefined ? null : String(input.limit),
      },
      "deck_source_service",
    );

    if (normalized.mode === "library") {
      if (!this.libraryService) {
        return { mode: "library", items: [] };
      }

      const records = await this.libraryService.execute({
        ...(normalized.query ? { query: normalized.query } : {}),
        ...(normalized.colors.length > 0 ? { colors: normalized.colors } : {}),
        pageSize: normalized.limit,
      });

      return {
        mode: "library",
        items: toLibrarySelectionItems(records).map((item) => item.selection),
      };
    }

    const result = await this.cardService.execute({
      ...(normalized.query ? { query: normalized.query } : {}),
      ...(normalized.colors.length > 0 ? { colors: normalized.colors } : {}),
      ...(normalized.typeLine ? { typeLine: normalized.typeLine } : {}),
      commanderOnly: normalized.commanderOnly,
      pool: "all",
      pageSize: normalized.limit,
      sort: "relevance",
    });

    return {
      mode: "all",
      items: toCardSelectionItems(result.items).map((item) => item.selection),
    };
  }
}
