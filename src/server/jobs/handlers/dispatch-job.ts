import { handlePriceRefresh } from "./handle-price-refresh";
import { handleRulingsRefresh } from "./handle-rulings-refresh";
import type { Job, PriceRefreshJob, RulingsRefreshJob } from "@/server/jobs/domain/job-types";

function isPriceRefreshJob(job: Job): job is PriceRefreshJob {
  return job.type === "PRICE_REFRESH" && "printingId" in job.payload;
}

function isRulingsRefreshJob(job: Job): job is RulingsRefreshJob {
  return job.type === "RULINGS_REFRESH" && "cardId" in job.payload;
}

/**
 * Routes a job to its handler based on job type.
 */
export async function dispatchJob(job: Job): Promise<void> {
  if (isPriceRefreshJob(job)) {
    await handlePriceRefresh(job);
    return;
  }

  if (isRulingsRefreshJob(job)) {
    await handleRulingsRefresh(job);
    return;
  }

  throw new Error(`Unknown or invalid job type: ${job.type}`);
}
