import type { SearchCardsService } from "@/modules/catalog";
import type { DeckRepository } from "@/modules/deck/domain/deck-repository";
import type {
  DeckGuidanceCandidate,
  DeckSuggestionNeed,
  DeckSuggestionSourceProvider as DeckSuggestionSourceProviderContract,
} from "@/modules/deck/domain/deck-intelligence";
import type { DeckSourceMode } from "@/modules/deck/domain/deck-record";

const needQuery: Record<DeckSuggestionNeed, string> = {
  lands: "land utility",
  ramp: "mana ramp",
  draw: "draw cards",
  interaction: "destroy target exile target counter target spell",
  low_curve: "cheap value",
  creature_support: "value creature",
};

const needReason: Record<DeckSuggestionNeed, string> = {
  lands: "Supports mana stability and turn progression.",
  ramp: "Improves acceleration into higher-impact turns.",
  draw: "Improves consistency in long multiplayer games.",
  interaction: "Adds reliable ways to answer opposing threats.",
  low_curve: "Smooths early sequencing and curve pressure.",
  creature_support: "Strengthens board presence and category balance.",
};

export class DeckSuggestionSourceService implements DeckSuggestionSourceProviderContract {
  constructor(
    private readonly dependencies: {
      searchCardsService: Pick<SearchCardsService, "execute">;
      deckRepository: DeckRepository;
    },
  ) {}

  async suggestByNeed(input: {
    need: DeckSuggestionNeed;
    sourceMode: DeckSourceMode;
    commanderColors: string[];
    limit: number;
  }): Promise<DeckGuidanceCandidate[]> {
    const query = needQuery[input.need];
    const fetched = await this.dependencies.searchCardsService.execute({
      query,
      pool: "all",
      commanderOnly: true,
      sort: "relevance",
      ...(input.commanderColors.length > 0 ? { colors: input.commanderColors as Array<"W" | "U" | "B" | "R" | "G"> } : {}),
      pageSize: Math.max(8, input.limit * 3),
    });

    if (input.sourceMode === "all") {
      return fetched.items.slice(0, input.limit).map((item) => ({
        cardId: item.id,
        oracleId: item.oracleId,
        name: item.name,
        manaCost: item.manaCost,
        typeLine: item.typeLine,
        imageUri: item.imageUri,
        priceUsd: item.price?.usd ?? null,
        availableQuantity: null,
        sourceMode: "all",
        reason: needReason[input.need],
      }));
    }

    const ownedCandidates = await Promise.all(
      fetched.items.map(async (item) => {
        const available = await this.dependencies.deckRepository.getOwnedQuantity({
          cardId: item.oracleId,
          printingId: null,
        });

        if (available <= 0) {
          return null;
        }

        return {
          cardId: item.id,
          oracleId: item.oracleId,
          name: item.name,
          manaCost: item.manaCost,
          typeLine: item.typeLine,
          imageUri: item.imageUri,
          priceUsd: item.price?.usd ?? null,
          availableQuantity: available,
          sourceMode: "library" as const,
          reason: `${needReason[input.need]} Available in your library.`,
        };
      }),
    );

    const narrowed: DeckGuidanceCandidate[] = [];
    for (const candidate of ownedCandidates) {
      if (candidate) {
        narrowed.push(candidate);
      }
    }

    return narrowed.slice(0, input.limit);
  }
}
