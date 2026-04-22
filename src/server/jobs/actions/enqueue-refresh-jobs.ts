"use server";

import { prisma } from "@/server/db/prisma";

/**
 * Server action to enqueue refresh jobs for a card.
 * Called when card detail page loads and data may be stale.
 */
export async function enqueueRefreshJobs(
  cardId: string,
  printingIds: string[],
): Promise<void> {
  try {
    // Check if the job models exist on prisma client (may not be regenerated yet)
    if (!prisma.refreshMetadata || !prisma.job) {
      return;
    }

    // Enqueue rulings refresh if needed
    const rulingsRefresh = await prisma.refreshMetadata.findUnique({
      where: {
        type_entityId: {
          type: "RULINGS",
          entityId: cardId,
        },
      },
    });

    if (
      !rulingsRefresh ||
      !rulingsRefresh.nextRefreshAt ||
      rulingsRefresh.nextRefreshAt < new Date()
    ) {
      await prisma.job.create({
        data: {
          type: "RULINGS_REFRESH",
          status: "PENDING",
          priority: 50,
          payload: { cardId },
          maxRetries: 3,
        },
      });
    }

    // Enqueue price refreshes for each printing
    for (const printingId of printingIds) {
      const priceRefresh = await prisma.refreshMetadata.findUnique({
        where: {
          type_entityId: {
            type: "PRICE",
            entityId: printingId,
          },
        },
      });

      if (
        !priceRefresh ||
        !priceRefresh.nextRefreshAt ||
        priceRefresh.nextRefreshAt < new Date()
      ) {
        await prisma.job.create({
          data: {
            type: "PRICE_REFRESH",
            status: "PENDING",
            priority: 100, // Lower priority than rulings
            payload: { printingId },
            maxRetries: 3,
          },
        });
      }
    }
  } catch (error) {
    // Silently fail - jobs are not critical for UX
    console.error("[Jobs] Failed to enqueue refresh jobs:", error);
  }
}

/**
 * Check if data for a card/printing is stale and needs refresh.
 * Returns default "not stale" values if the job tables don't exist yet.
 */
export async function getRefreshStatus(
  cardId: string,
  printingIds: string[],
): Promise<{
  rulingsStale: boolean;
  pricesStale: number; // Count of stale printings
  lastRulingsRefresh: Date | null;
}> {
  try {
    // Check if the refreshMetadata model exists on prisma client
    if (!prisma.refreshMetadata) {
      return { rulingsStale: false, pricesStale: 0, lastRulingsRefresh: null };
    }

    const rulingsRefresh = await prisma.refreshMetadata.findUnique({
      where: {
        type_entityId: {
          type: "RULINGS",
          entityId: cardId,
        },
      },
    });

    const priceRefreshes = await prisma.refreshMetadata.findMany({
      where: {
        type: "PRICE",
        entityId: { in: printingIds },
      },
    });

    const rulingsStale =
      !rulingsRefresh?.lastRefreshedAt ||
      new Date().getTime() - rulingsRefresh.lastRefreshedAt.getTime() >
        30 * 24 * 60 * 60 * 1000; // 30 days

    const pricesStale = printingIds.filter((id) => {
      const meta = priceRefreshes.find((m) => m.entityId === id);
      if (!meta?.lastRefreshedAt) return true;
      return (
        new Date().getTime() - meta.lastRefreshedAt.getTime() >
        7 * 24 * 60 * 60 * 1000
      ); // 7 days
    }).length;

    return {
      rulingsStale,
      pricesStale,
      lastRulingsRefresh: rulingsRefresh?.lastRefreshedAt ?? null,
    };
  } catch (error) {
    // Return default values if tables don't exist or Prisma client not regenerated
    console.error("[Jobs] Failed to get refresh status:", error);
    return { rulingsStale: false, pricesStale: 0, lastRulingsRefresh: null };
  }
}
