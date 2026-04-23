-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."CardLayout" AS ENUM ('NORMAL', 'SPLIT', 'MODAL_DFC', 'TRANSFORM', 'ADVENTURE', 'SAGA', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."CollectionFinish" AS ENUM ('NONFOIL', 'FOIL', 'ETCHED');

-- CreateEnum
CREATE TYPE "public"."CollectionCondition" AS ENUM ('NM', 'LP', 'MP', 'HP', 'DMG');

-- CreateEnum
CREATE TYPE "public"."DeckSourceMode" AS ENUM ('ALL', 'LIBRARY');

-- CreateEnum
CREATE TYPE "public"."DeckCardZone" AS ENUM ('COMMANDER', 'MAINBOARD');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."JobType" AS ENUM ('PRICE_REFRESH', 'RULINGS_REFRESH', 'CARD_METADATA_SYNC');

-- CreateEnum
CREATE TYPE "public"."RefreshType" AS ENUM ('PRICE', 'RULINGS');

-- CreateTable
CREATE TABLE "public"."Card" (
    "id" TEXT NOT NULL,
    "oracleId" TEXT NOT NULL,
    "scryfallId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" VARCHAR(256) NOT NULL,
    "manaCost" TEXT,
    "cmc" DECIMAL(4,2) NOT NULL,
    "typeLine" TEXT NOT NULL,
    "oracleText" TEXT,
    "power" TEXT,
    "toughness" TEXT,
    "colorIdentity" TEXT[],
    "keywords" TEXT[],
    "layout" "public"."CardLayout" NOT NULL DEFAULT 'NORMAL',
    "reserved" BOOLEAN NOT NULL DEFAULT false,
    "legalCommander" BOOLEAN NOT NULL DEFAULT true,
    "imageUriNormal" TEXT,
    "imageUriArtCrop" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CardPrinting" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "scryfallPrintingId" TEXT NOT NULL,
    "setCode" VARCHAR(8) NOT NULL,
    "setName" TEXT NOT NULL,
    "collectorNumber" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "finishes" TEXT[],
    "imageUriNormal" TEXT,
    "imageUriArtCrop" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardPrinting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PriceSnapshot" (
    "id" TEXT NOT NULL,
    "printingId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'SCRYFALL',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "usd" DECIMAL(10,2),
    "usdFoil" DECIMAL(10,2),
    "usdEtched" DECIMAL(10,2),
    "eur" DECIMAL(10,2),
    "eurFoil" DECIMAL(10,2),
    "tix" DECIMAL(10,2),
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AppUser" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT,
    "email" TEXT,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollectionEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "printingId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollectionHolding" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "finish" "public"."CollectionFinish" NOT NULL DEFAULT 'NONFOIL',
    "condition" "public"."CollectionCondition" NOT NULL DEFAULT 'NM',
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Deck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "preferredSource" "public"."DeckSourceMode" NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeckTag" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeckTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeckCardEntry" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "printingId" TEXT,
    "zone" "public"."DeckCardZone" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeckCardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultSourceMode" "public"."DeckSourceMode" NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TrackerSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "gameState" JSONB NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScannerImport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "extractedText" TEXT,
    "candidateCardId" TEXT,
    "candidatePrintingId" TEXT,
    "confidence" DECIMAL(5,4),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScannerImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Job" (
    "id" TEXT NOT NULL,
    "type" "public"."JobType" NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "payload" JSONB NOT NULL,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CardRuling" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardRuling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RefreshMetadata" (
    "id" TEXT NOT NULL,
    "type" "public"."RefreshType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "lastRefreshedAt" TIMESTAMP(3),
    "nextRefreshAt" TIMESTAMP(3),
    "refreshCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Card_oracleId_key" ON "public"."Card"("oracleId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_scryfallId_key" ON "public"."Card"("scryfallId");

-- CreateIndex
CREATE INDEX "Card_normalizedName_idx" ON "public"."Card"("normalizedName");

-- CreateIndex
CREATE INDEX "Card_legalCommander_idx" ON "public"."Card"("legalCommander");

-- CreateIndex
CREATE UNIQUE INDEX "CardPrinting_scryfallPrintingId_key" ON "public"."CardPrinting"("scryfallPrintingId");

-- CreateIndex
CREATE INDEX "CardPrinting_setCode_idx" ON "public"."CardPrinting"("setCode");

-- CreateIndex
CREATE INDEX "CardPrinting_releasedAt_idx" ON "public"."CardPrinting"("releasedAt");

-- CreateIndex
CREATE INDEX "CardPrinting_cardId_idx" ON "public"."CardPrinting"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceSnapshot_printingId_key" ON "public"."PriceSnapshot"("printingId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_capturedAt_idx" ON "public"."PriceSnapshot"("capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_authUserId_key" ON "public"."AppUser"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_email_key" ON "public"."AppUser"("email");

-- CreateIndex
CREATE INDEX "CollectionEntry_userId_cardId_idx" ON "public"."CollectionEntry"("userId", "cardId");

-- CreateIndex
CREATE INDEX "CollectionEntry_userId_printingId_idx" ON "public"."CollectionEntry"("userId", "printingId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionEntry_userId_cardId_printingId_key" ON "public"."CollectionEntry"("userId", "cardId", "printingId");

-- CreateIndex
CREATE INDEX "CollectionHolding_entryId_idx" ON "public"."CollectionHolding"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionHolding_entryId_finish_condition_key" ON "public"."CollectionHolding"("entryId", "finish", "condition");

-- CreateIndex
CREATE UNIQUE INDEX "Deck_slug_key" ON "public"."Deck"("slug");

-- CreateIndex
CREATE INDEX "Deck_userId_name_idx" ON "public"."Deck"("userId", "name");

-- CreateIndex
CREATE INDEX "DeckTag_deckId_idx" ON "public"."DeckTag"("deckId");

-- CreateIndex
CREATE UNIQUE INDEX "DeckTag_deckId_value_key" ON "public"."DeckTag"("deckId", "value");

-- CreateIndex
CREATE INDEX "DeckCardEntry_deckId_zone_idx" ON "public"."DeckCardEntry"("deckId", "zone");

-- CreateIndex
CREATE UNIQUE INDEX "DeckCardEntry_deckId_cardId_zone_key" ON "public"."DeckCardEntry"("deckId", "cardId", "zone");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "public"."UserPreference"("userId");

-- CreateIndex
CREATE INDEX "TrackerSession_userId_updatedAt_idx" ON "public"."TrackerSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ScannerImport_userId_createdAt_idx" ON "public"."ScannerImport"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ScannerImport_scanId_idx" ON "public"."ScannerImport"("scanId");

-- CreateIndex
CREATE INDEX "Job_status_priority_createdAt_idx" ON "public"."Job"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "Job_type_status_idx" ON "public"."Job"("type", "status");

-- CreateIndex
CREATE INDEX "CardRuling_cardId_idx" ON "public"."CardRuling"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "CardRuling_cardId_source_publishedAt_comment_key" ON "public"."CardRuling"("cardId", "source", "publishedAt", "comment");

-- CreateIndex
CREATE INDEX "RefreshMetadata_nextRefreshAt_idx" ON "public"."RefreshMetadata"("nextRefreshAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshMetadata_type_entityId_key" ON "public"."RefreshMetadata"("type", "entityId");

-- AddForeignKey
ALTER TABLE "public"."CardPrinting" ADD CONSTRAINT "CardPrinting_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_printingId_fkey" FOREIGN KEY ("printingId") REFERENCES "public"."CardPrinting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollectionEntry" ADD CONSTRAINT "CollectionEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollectionEntry" ADD CONSTRAINT "CollectionEntry_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollectionEntry" ADD CONSTRAINT "CollectionEntry_printingId_fkey" FOREIGN KEY ("printingId") REFERENCES "public"."CardPrinting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollectionHolding" ADD CONSTRAINT "CollectionHolding_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "public"."CollectionEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deck" ADD CONSTRAINT "Deck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeckTag" ADD CONSTRAINT "DeckTag_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "public"."Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeckCardEntry" ADD CONSTRAINT "DeckCardEntry_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "public"."Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeckCardEntry" ADD CONSTRAINT "DeckCardEntry_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeckCardEntry" ADD CONSTRAINT "DeckCardEntry_printingId_fkey" FOREIGN KEY ("printingId") REFERENCES "public"."CardPrinting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrackerSession" ADD CONSTRAINT "TrackerSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScannerImport" ADD CONSTRAINT "ScannerImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CardRuling" ADD CONSTRAINT "CardRuling_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

