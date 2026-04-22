import { z } from "zod";
import type { CardCatalogRepositoryMap } from "@/modules/catalog/domain/card-catalog-repository";
import { CARD_POOLS, type CardDetailRecord, type CardPool } from "@/modules/catalog/domain/card-record";

const getCardDetailInputSchema = z.object({
  cardId: z.string().trim().min(1),
  pool: z.enum(CARD_POOLS).default("all"),
});

type GetCardDetailInput = {
  cardId: string;
  pool?: CardPool;
};

export class GetCardDetailService {
  constructor(private readonly repositories: CardCatalogRepositoryMap) {}

  async execute(input: GetCardDetailInput): Promise<CardDetailRecord | null> {
    const parsed = getCardDetailInputSchema.parse(input);
    const repository = this.repositories[parsed.pool];

    if (!repository) {
      return null;
    }

    return repository.getById(parsed.cardId);
  }
}
