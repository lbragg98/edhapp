import { DeckService } from "@/modules/deck/application/deck-service";
import { DeckSuggestionSourceService } from "@/modules/deck/application/deck-suggestion-source-provider";
import { PrismaDeckRepository } from "@/modules/deck/infrastructure/prisma-deck-repository";
import { StaticComboDataSource } from "@/modules/deck/infrastructure/static-combo-data-source";
import { createSearchCardsService } from "@/modules/catalog";
import { prisma } from "@/server/db/prisma";

export function createDeckService(userId: string) {
  if (!prisma) {
    return null;
  }

  const repository = new PrismaDeckRepository(prisma, userId);

  return new DeckService(repository, {
    sourceProvider: new DeckSuggestionSourceService({
      searchCardsService: createSearchCardsService(userId),
      deckRepository: repository,
    }),
    comboDataSource: new StaticComboDataSource(),
  });
}
