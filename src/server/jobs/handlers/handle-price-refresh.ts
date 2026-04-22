import { prisma } from "@/server/db/prisma";
import { createScryfallCardCatalogRepository } from "@/modules/catalog";
import type { PriceRefreshJob } from "@/server/jobs/domain/job-types";

/**
 * Handler for PRICE_REFRESH jobs.
 * Fetches the latest card pricing from Scryfall and updates the database.
 */
export async function handlePriceRefresh(job: PriceRefreshJob): Promise<void> {
  const { printingId } = job.payload;

  // Fetch the printing from the database to get oracle ID
  const printing = await prisma.cardPrinting.findUnique({
    where: { id: printingId },
    include: { card: true },
  });

  if (!printing) {
    throw new Error(`Printing not found: ${printingId}`);
  }

  // Get card catalog repository (no user scoping needed for public data)
  const catalogRepo = createScryfallCardCatalogRepository();

  // Fetch fresh data from Scryfall using the printing ID (which is the Scryfall ID)
  const scryfallCard = await catalogRepo.getById(printingId);

  if (!scryfallCard) {
    throw new Error(`Card not found in Scryfall: ${printingId}`);
  }

  // Update the printing with fresh price data
  if (scryfallCard.price) {
    await prisma.cardPrinting.update({
      where: { id: printingId },
      data: {
        priceSnapshot: {
          source: scryfallCard.price.source,
          capturedAt: new Date(),
          usd: scryfallCard.price.usd,
          usdFoil: scryfallCard.price.usdFoil,
          usdEtched: scryfallCard.price.usdEtched,
          eur: scryfallCard.price.eur,
          eurFoil: scryfallCard.price.eurFoil,
          tix: scryfallCard.price.tix,
        },
      },
    });
  }

  // Update refresh metadata
  await prisma.refreshMetadata.upsert({
    where: {
      type_entityId: {
        type: "PRICE",
        entityId: printingId,
      },
    },
    update: {
      lastRefreshedAt: new Date(),
      nextRefreshAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      refreshCount: { increment: 1 },
    },
    create: {
      type: "PRICE",
      entityId: printingId,
      lastRefreshedAt: new Date(),
      nextRefreshAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      refreshCount: 1,
    },
  });
}
