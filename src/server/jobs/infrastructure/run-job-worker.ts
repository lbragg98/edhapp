import { prisma } from "@/server/db/prisma";
import { dispatchJob } from "@/server/jobs/handlers/dispatch-job";

const MAX_JOBS_PER_RUN = 50;
const STALE_JOB_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Job worker that processes pending jobs from the queue.
 * Handles retries, updates job status, and manages errors.
 */
export async function runJobWorker(): Promise<{
  processed: number;
  failed: number;
  errors: string[];
}> {
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
      await dispatchJob({
        id: job.id,
        type: job.type as any,
        payload: job.payload,
        status: "PROCESSING",
        priority: job.priority,
        maxRetries: job.maxRetries,
        retryCount: job.retryCount,
        lastError: job.lastError,
        createdAt: job.createdAt,
        processedAt: job.processedAt!,
        completedAt: job.completedAt,
        updatedAt: job.updatedAt,
      });

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
