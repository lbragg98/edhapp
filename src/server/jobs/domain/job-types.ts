/**
 * Background Jobs Domain Types
 *
 * Defines job types, payloads, and queue interface for async processing.
 * Supports price refresh, rulings refresh, and extensible for future job types.
 */

// ────────────────────────────────────────────────────────────────────────────
// Job Type Definitions
// ────────────────────────────────────────────────────────────────────────────

export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type JobType = "PRICE_REFRESH" | "RULINGS_REFRESH" | "CARD_METADATA_SYNC";

/**
 * Payload for price refresh jobs.
 * Fetches current prices from Scryfall for a batch of card printings.
 */
export type PriceRefreshPayload = {
  printingIds: string[];
};

/**
 * Payload for rulings refresh jobs.
 * Fetches current rulings from Scryfall for a batch of cards.
 */
export type RulingsRefreshPayload = {
  cardIds: string[];
};

/**
 * Payload for card metadata sync jobs.
 * Syncs card data from Scryfall (oracle text, legality, etc.).
 */
export type CardMetadataSyncPayload = {
  cardIds: string[];
};

export type JobPayload =
  | { type: "PRICE_REFRESH"; data: PriceRefreshPayload }
  | { type: "RULINGS_REFRESH"; data: RulingsRefreshPayload }
  | { type: "CARD_METADATA_SYNC"; data: CardMetadataSyncPayload };

/**
 * Core job descriptor for queue operations.
 */
export type JobDescriptor = {
  id: string;
  type: JobType;
  status: JobStatus;
  priority: number;
  payload: JobPayload;
  maxRetries: number;
  retryCount: number;
  lastError: string | null;
  createdAt: Date;
  processedAt: Date | null;
  completedAt: Date | null;
};

/**
 * Input for creating a new job.
 */
export type CreateJobInput = {
  type: JobType;
  payload: JobPayload;
  priority?: number;
  maxRetries?: number;
};

/**
 * Result of job processing.
 */
export type JobResult = {
  success: boolean;
  error?: string;
  processedCount?: number;
  failedCount?: number;
};

// ────────────────────────────────────────────────────────────────────────────
// Queue Interface
// ────────────────────────────────────────────────────────────────────────────

/**
 * Job queue interface for background processing.
 *
 * Implementations:
 * - PrismaJobQueue: Database-backed queue using Job table
 * - (Future) RedisJobQueue: Redis-backed for higher throughput
 */
export interface JobQueue {
  /**
   * Enqueue a new job for processing.
   */
  enqueue(input: CreateJobInput): Promise<JobDescriptor>;

  /**
   * Dequeue jobs for processing (marks as PROCESSING).
   * Returns up to `limit` jobs ordered by priority and creation time.
   */
  dequeue(limit: number): Promise<JobDescriptor[]>;

  /**
   * Mark a job as completed.
   */
  complete(jobId: string): Promise<void>;

  /**
   * Mark a job as failed with error message.
   * Increments retry count; requeues if under maxRetries.
   */
  fail(jobId: string, error: string): Promise<void>;

  /**
   * Get job by ID.
   */
  getById(jobId: string): Promise<JobDescriptor | null>;

  /**
   * Get pending job count by type.
   */
  getPendingCount(type?: JobType): Promise<number>;
}

// ────────────────────────────────────────────────────────────────────────────
// Handler Interface
// ────────────────────────────────────────────────────────────────────────────

/**
 * Job handler interface for processing specific job types.
 */
export interface JobHandler<T extends JobPayload = JobPayload> {
  readonly type: JobType;
  handle(payload: T): Promise<JobResult>;
}

// ────────────────────────────────────────────────────────────────────────────
// Staleness Configuration
// ────────────────────────────────────────────────────────────────────────────

/**
 * Default staleness thresholds (in days).
 */
export const STALENESS_THRESHOLDS = {
  /** Prices older than this are considered stale and trigger refresh */
  PRICE_STALE_DAYS: 7,
  /** Rulings older than this are considered stale and trigger refresh */
  RULINGS_STALE_DAYS: 14,
  /** Batch size for refresh jobs */
  REFRESH_BATCH_SIZE: 50,
} as const;

/**
 * Check if a date is stale based on days threshold.
 */
export function isStale(date: Date | null, thresholdDays: number): boolean {
  if (!date) return true;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > thresholdDays;
}

/**
 * Get human-readable staleness text.
 */
export function getStalenessText(date: Date | null): string {
  if (!date) return "Never updated";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Updated today";
  if (diffDays === 1) return "Updated yesterday";
  if (diffDays < 7) return `Updated ${diffDays} days ago`;
  if (diffDays < 30) return `Updated ${Math.floor(diffDays / 7)} weeks ago`;
  return `Updated ${Math.floor(diffDays / 30)} months ago`;
}
