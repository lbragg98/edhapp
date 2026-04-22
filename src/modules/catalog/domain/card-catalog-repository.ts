import type {
  CardDetailRecord,
  CardPool,
  CardSearchResult,
  NormalizedCardSearchInput,
} from "@/modules/catalog/domain/card-record";

export interface CardCatalogRepository {
  search(input: NormalizedCardSearchInput): Promise<CardSearchResult>;
  getById(cardId: string): Promise<CardDetailRecord | null>;
}

export type CardCatalogRepositoryMap = Partial<Record<CardPool, CardCatalogRepository>>;
