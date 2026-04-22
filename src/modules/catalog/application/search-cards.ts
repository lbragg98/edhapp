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
    const query = normalizeCardSearchInput(input);
    const repository = this.repositories[query.pool];

    if (!repository) {
      return emptyResult;
    }

    return repository.search(query);
  }
}
