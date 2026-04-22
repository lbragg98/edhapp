/**
 * Prisma-backed Job Queue Implementation
 *
 * Uses the Job table for persistent, reliable job processing.
 * Supports prioritization, retries, and failure tracking.
 */

import { prisma } from "@/server/db/prisma";
import type {
  JobQueue,
  JobDescriptor,
  CreateJobInput,
  JobType,
  JobPayload,
} from "@/server/jobs/domain/job-types";

/**
 * Maps Prisma Job record to JobDescriptor.
 */
function toJobDescriptor(record: {
  id: string;
  type: string;
  status: string;
  priority: number;
  payload: unknown;
  maxRetries: number;
  retryCount: number;
  lastError: string | null;
  createdAt: Date;
  processedAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date;
}): JobDescriptor {
  return {
    id: record.id,
    type: record.type as JobType,
    status: record.status as JobDescriptor["status"],
    priority: record.priority,
    payload: record.payload as JobPayload,
    maxRetries: record.maxRetries,
    retryCount: record.retryCount,
    lastError: record.lastError,
    createdAt: record.createdAt,
    processedAt: record.processedAt,
    completedAt: record.completedAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Prisma-backed job queue implementation.
 */
export class PrismaJobQueue implements JobQueue {
  private getDb() {
    if (!prisma) {
      throw new Error("Database is unavailable.");
    }

    return prisma;
  }

  async enqueue(input: CreateJobInput): Promise<JobDescriptor> {
    const db = this.getDb();
    const record = await db.job.create({
      data: {
        type: input.type,
        status: "PENDING",
        priority: input.priority ?? 100,
        payload: input.payload as object,
        maxRetries: input.maxRetries ?? 3,
        retryCount: 0,
      },
    });

    return toJobDescriptor(record);
  }

  async dequeue(limit: number): Promise<JobDescriptor[]> {
    const db = this.getDb();
    // Find pending jobs ordered by priority (lower = higher) and creation time
    const pendingJobs = await db.job.findMany({
      where: { status: "PENDING" },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take: limit,
    });

    if (pendingJobs.length === 0) return [];

    // Mark them as processing
    const jobIds = pendingJobs.map((j) => j.id);
    await db.job.updateMany({
      where: { id: { in: jobIds } },
      data: {
        status: "PROCESSING",
        processedAt: new Date(),
      },
    });

    // Refetch to get updated records
    const processingJobs = await db.job.findMany({
      where: { id: { in: jobIds } },
    });

    return processingJobs.map(toJobDescriptor);
  }

  async complete(jobId: string): Promise<void> {
    const db = this.getDb();
    await db.job.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }

  async fail(jobId: string, error: string): Promise<void> {
    const db = this.getDb();
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (!job) return;

    const newRetryCount = job.retryCount + 1;
    const shouldRequeue = newRetryCount < job.maxRetries;

    await db.job.update({
      where: { id: jobId },
      data: {
        status: shouldRequeue ? "PENDING" : "FAILED",
        retryCount: newRetryCount,
        lastError: error,
        // Reset processedAt if requeuing
        processedAt: shouldRequeue ? null : job.processedAt,
      },
    });
  }

  async getById(jobId: string): Promise<JobDescriptor | null> {
    const db = this.getDb();
    const record = await db.job.findUnique({ where: { id: jobId } });
    return record ? toJobDescriptor(record) : null;
  }

  async getPendingCount(type?: JobType): Promise<number> {
    const db = this.getDb();
    return db.job.count({
      where: {
        status: "PENDING",
        ...(type && { type }),
      },
    });
  }
}

/**
 * Singleton instance of the job queue.
 */
export const jobQueue = new PrismaJobQueue();
