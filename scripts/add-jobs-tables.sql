-- Migration: Add Background Jobs Infrastructure
-- Adds Job, CardRuling, and RefreshMetadata tables for async processing

-- Job status enum
DO $$ BEGIN
  CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Job type enum
DO $$ BEGIN
  CREATE TYPE "JobType" AS ENUM ('PRICE_REFRESH', 'RULINGS_REFRESH', 'CARD_METADATA_SYNC');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Refresh type enum
DO $$ BEGIN
  CREATE TYPE "RefreshType" AS ENUM ('PRICE', 'RULINGS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Job table for background processing queue
CREATE TABLE IF NOT EXISTS "Job" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "type" "JobType" NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "priority" INTEGER NOT NULL DEFAULT 100,
  "payload" JSONB NOT NULL,
  "maxRetries" INTEGER NOT NULL DEFAULT 3,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient job dequeue
CREATE INDEX IF NOT EXISTS "Job_status_priority_createdAt_idx" ON "Job"("status", "priority", "createdAt");
CREATE INDEX IF NOT EXISTS "Job_type_status_idx" ON "Job"("type", "status");

-- Card rulings table for cached Scryfall rulings
CREATE TABLE IF NOT EXISTS "CardRuling" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "cardId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "comment" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CardRuling_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Index for efficient rulings lookup
CREATE INDEX IF NOT EXISTS "CardRuling_cardId_idx" ON "CardRuling"("cardId");

-- Unique constraint to prevent duplicate rulings
CREATE UNIQUE INDEX IF NOT EXISTS "CardRuling_cardId_source_publishedAt_comment_key" 
ON "CardRuling"("cardId", "source", "publishedAt", "comment");

-- Refresh metadata table for staleness tracking
CREATE TABLE IF NOT EXISTS "RefreshMetadata" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "type" "RefreshType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "lastRefreshedAt" TIMESTAMP(3),
  "nextRefreshAt" TIMESTAMP(3),
  "refreshCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint on type + entity
CREATE UNIQUE INDEX IF NOT EXISTS "RefreshMetadata_type_entityId_key" ON "RefreshMetadata"("type", "entityId");

-- Index for finding stale entries
CREATE INDEX IF NOT EXISTS "RefreshMetadata_nextRefreshAt_idx" ON "RefreshMetadata"("nextRefreshAt");

-- Add rulings relation to Card (if column doesn't exist, this is handled by Prisma)
-- The relation is defined in schema.prisma, no column changes needed on Card table
