import { handlePriceRefresh } from "./handle-price-refresh";
import { handleRulingsRefresh } from "./handle-rulings-refresh";
import type { Job } from "@/server/jobs/domain/job-types";

/**
 * Routes a job to its handler based on job type.
 */
export async function dispatchJob(job: Job): Promise<void> {
  switch (job.type) {
    case "PRICE_REFRESH":
      await handlePriceRefresh(job as any);
      break;
    case "RULINGS_REFRESH":
      await handleRulingsRefresh(job as any);
      break;
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}
