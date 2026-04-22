import { GetCardDetailService } from "@/modules/catalog/application/get-card-detail";
import { SearchCardsService } from "@/modules/catalog/application/search-cards";
import { LibraryCardCatalogRepository } from "@/modules/catalog/infrastructure/library-card-catalog-repository";
import { ScryfallCardCatalogRepository } from "@/modules/catalog/infrastructure/scryfall/scryfall-card-catalog-repository";
import { prisma } from "@/server/db/prisma";

export function createSearchCardsService(userId?: string) {
  const repositories = {
    all: new ScryfallCardCatalogRepository(),
    ...(userId ? { library: new LibraryCardCatalogRepository(prisma, userId) } : {}),
  };

  return new SearchCardsService(repositories);
}

export function createGetCardDetailService(userId?: string) {
  const repositories = {
    all: new ScryfallCardCatalogRepository(),
    ...(userId ? { library: new LibraryCardCatalogRepository(prisma, userId) } : {}),
  };

  return new GetCardDetailService(repositories);
}
