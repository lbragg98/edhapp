import { prisma } from "@/server/db/prisma";
import { dispatchJob } from "@/server/jobs/handlers/dispatch-job";
import type { Job, JobType, JobStatus } from "@/server/jobs/domain/job-types";

const MAX_JOBS_PER_RUN = 50;
const STALE_JOB_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const validJobTypes: ReadonlyArray<JobType> = ["PRICE_REFRESH", "RULINGS_REFRESH", "CARD_METADATA_SYNC"];
const validJobStatuses: ReadonlyArray<JobStatus> = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"];

function asJobType(value: string): JobType | null {
  return validJobTypes.includes(value as JobType) ? (value as JobType) : null;
}

function asJobStatus(value: string): JobStatus | null {
  return validJobStatuses.includes(value as JobStatus) ? (value as JobStatus) : null;
}

/**
 * Job worker that processes pending jobs from the queue.
 * Handles retries, updates job status, and manages errors.
 */
export async function runJobWorker(): Promise<{
  processed: number;
  failed: number;
  errors: string[];
}> {
  if (!prisma) {
    return { processed: 0, failed: 0, errors: ["Database is unavailable."] };
  }

  const errors: string[] = [];
  let processed = 0;
  let failed = 0;

  // Mark stale jobs as pending to allow retry
  await prisma.job.updateMany({
    where: {
      status: "PROCESSING",
      processedAt: {
        lt: new Date(Date.now() - STALE_JOB_TIMEOUT_MS),
      },
    },
    data: {
      status: "PENDING",
      processedAt: null,
    },
  });

  // Fetch pending jobs ordered by priority and age
  const jobs = await prisma.job.findMany({
    where: { status: "PENDING" },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    take: MAX_JOBS_PER_RUN,
  });

  for (const job of jobs) {
    try {
      // Mark as processing
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "PROCESSING", processedAt: new Date() },
      });

      // Execute job handler
      const type = asJobType(job.type);
      const status = asJobStatus("PROCESSING");

      if (!type || !status) {
        throw new Error(`Invalid job type/status for job ${job.id}`);
      }

      const jobForDispatch: Job = {
        id: job.id,
        type,
        payload: job.payload as Job["payload"],
        status,
        priority: job.priority,
        maxRetries: job.maxRetries,
        retryCount: job.retryCount,
        lastError: job.lastError,
        createdAt: job.createdAt,
        processedAt: job.processedAt,
        completedAt: job.completedAt,
        updatedAt: job.updatedAt,
      };

      await dispatchJob(jobForDispatch);

      // Mark as completed
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          lastError: null,
        },
      });

      processed++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const shouldRetry = job.retryCount < job.maxRetries;

      if (shouldRetry) {
        // Retry with exponential backoff
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: "PENDING",
            retryCount: { increment: 1 },
            lastError: errorMessage,
            processedAt: null,
            priority: job.priority + 10, // Lower priority for retries
          },
        });
      } else {
        // Max retries exceeded
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            lastError: errorMessage,
          },
        });
        failed++;
        errors.push(`Job ${job.id}: ${errorMessage}`);
      }
    }
  }

  return { processed, failed, errors };
}
