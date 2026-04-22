import type { DeckSourceQuery, DeckSourceResult } from "@/modules/deckbuilder/domain/deck-source";
import { createSearchCardsService, toCardSelectionItems } from "@/modules/catalog";
import { createListLibraryCardsService, toLibrarySelectionItems } from "@/modules/library";
import type { SearchCardsService } from "@/modules/catalog";
import type { ListLibraryCardsService } from "@/modules/library";

export class DeckSourceService {
  private readonly cardService: SearchCardsService;

  private readonly libraryService: ListLibraryCardsService | null;

  constructor(userId?: string) {
    this.cardService = createSearchCardsService(userId);
    this.libraryService = userId ? createListLibraryCardsService(userId) : null;
  }

  async execute(input: DeckSourceQuery): Promise<DeckSourceResult> {
    if (input.mode === "library") {
      if (!this.libraryService) {
        return { mode: "library", items: [] };
      }

      const records = await this.libraryService.execute({
        ...(input.query ? { query: input.query } : {}),
        ...(input.colors ? { colors: input.colors } : {}),
        pageSize: input.limit ?? 18,
      });

      return {
        mode: "library",
      items: toLibrarySelectionItems(records).map((item) => item.selection),
      };
    }

    const result = await this.cardService.execute({
      ...(input.query ? { query: input.query } : {}),
      ...(input.colors ? { colors: input.colors } : {}),
      ...(input.typeLine ? { typeLine: input.typeLine } : {}),
      commanderOnly: input.commanderOnly ?? true,
      pool: "all",
      pageSize: input.limit ?? 18,
      sort: "relevance",
    });

    return {
      mode: "all",
      items: toCardSelectionItems(result.items).map((item) => item.selection),
    };
  }
}
