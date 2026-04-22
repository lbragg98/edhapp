import type {
  CardSearchInput,
  CardSearchResult,
} from "@/modules/catalog/domain/card-record";
import type { CardCatalogRepositoryMap } from "@/modules/catalog/domain/card-catalog-repository";
import { normalizeCardSearchInput } from "@/modules/catalog/application/card-search-input";

const emptyResult: CardSearchResult = {
  items: [],
  hasMore: false,
  nextPage: null,
  total: 0,
};

export class SearchCardsService {
  constructor(private readonly repositories: CardCatalogRepositoryMap) {}

  async execute(input: CardSearchInput): Promise<CardSearchResult> {
    let query;
    try {
      query = normalizeCardSearchInput(input);
    } catch (error) {
      console.warn("[Filters][catalog] Invalid card search input. Falling back to defaults.", {
        input,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      query = normalizeCardSearchInput({});
    }
    const repository = this.repositories[query.pool];

    if (!repository) {
      return emptyResult;
    }

    return repository.search(query);
  }
}
