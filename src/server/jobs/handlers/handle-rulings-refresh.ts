import { prisma } from "@/server/db/prisma";
import { fetchScryfallRulings } from "@/modules/catalog/infrastructure/scryfall/fetch-rulings";
import type { RulingsRefreshJob } from "@/server/jobs/domain/job-types";

/**
 * Handler for RULINGS_REFRESH jobs.
 * Fetches the latest card rulings from Scryfall and stores them in the database.
 */
export async function handleRulingsRefresh(job: RulingsRefreshJob): Promise<void> {
  if (!prisma) {
    throw new Error("Database is unavailable.");
  }

  const { cardId } = job.payload;

  // Verify card exists
  const card = await prisma.card.findUnique({
    where: { id: cardId },
  });

  if (!card) {
    throw new Error(`Card not found: ${cardId}`);
  }

  // Fetch fresh rulings from Scryfall
  const rulings = await fetchScryfallRulings(cardId);

  // Use a transaction to ensure atomic updates
  await prisma.$transaction(async (tx) => {
    // Clear existing rulings for this card
    await tx.cardRuling.deleteMany({
      where: { cardId },
    });

    // Insert fresh rulings
    if (rulings.length > 0) {
      await tx.cardRuling.createMany({
        data: rulings.map((ruling) => ({
          cardId,
          source: ruling.source,
          publishedAt: ruling.publishedAt,
          comment: ruling.comment,
        })),
        skipDuplicates: true,
      });
    }

    // Update refresh metadata
    await tx.refreshMetadata.upsert({
      where: {
        type_entityId: {
          type: "RULINGS",
          entityId: cardId,
        },
      },
      update: {
        lastRefreshedAt: new Date(),
        nextRefreshAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        refreshCount: { increment: 1 },
      },
      create: {
        type: "RULINGS",
        entityId: cardId,
        lastRefreshedAt: new Date(),
        nextRefreshAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        refreshCount: 1,
      },
    });
  });
}
