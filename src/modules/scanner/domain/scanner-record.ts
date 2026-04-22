import type { CardListItem } from "@/modules/catalog";

export type ScannerIssueCode =
  | "image_missing"
  | "image_invalid"
  | "scan_error"
  | "ocr_unavailable"
  | "ocr_empty"
  | "low_confidence_match";

export type ScannerIssue = {
  code: ScannerIssueCode;
  message: string;
};

export type ScannerStageStatus = "ok" | "warning" | "error";

export type ScannerStageName = "capture" | "region_detection" | "ocr" | "matching";

export type ScannerStageReport = {
  stage: ScannerStageName;
  status: ScannerStageStatus;
  summary: string;
};

export type ScannerProcessedImage = {
  bytes: Uint8Array;
  mimeType: string;
};

export type ScannerRegion = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
};

export type OcrRegionResult = {
  regionId: string;
  text: string;
  confidence: number;
};

export type ScannerCandidateMatch = {
  card: CardListItem;
  confidence: number;
  reasons: string[];
};

export type ScannerScanInput = {
  image: ScannerProcessedImage;
  manualText?: string;
};

export type ScannerScanResult = {
  scanId: string;
  capturedAt: string;
  extractedText: string;
  extractionConfidence: number;
  regions: ScannerRegion[];
  candidates: ScannerCandidateMatch[];
  issues: ScannerIssue[];
  stages: ScannerStageReport[];
};

export interface ScannerRegionDetector {
  detect(input: ScannerProcessedImage): Promise<ScannerRegion[]>;
}

export interface ScannerOcrAdapter {
  recognize(input: { image: ScannerProcessedImage; regions: ScannerRegion[] }): Promise<OcrRegionResult[]>;
}

// ────────────────────────────────────────────────────────────────────────────
// Confirmation & Import Flow Types
// ────────────────────────────────────────────────────────────────────────────

/**
 * A printing option returned by the printing resolver.
 * Each option represents a unique (set, collector number, finishes) combination.
 */
export type ScannerPrintingOption = {
  scryfallId: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  rarity: string;
  releasedAt: string | null;
  finishes: string[];
  imageUri: string | null;
  price: {
    usd: string | null;
    usdFoil: string | null;
  } | null;
};

/**
 * The user's selections for confirming a scanned card before library import.
 */
export type ScannerConfirmationInput = {
  scanId: string;
  /** The selected CardListItem id (oracle-based). */
  cardId: string;
  /** The selected printing's scryfallId. */
  printingId: string;
  finish: "NONFOIL" | "FOIL" | "ETCHED";
  condition: "NM" | "LP" | "MP" | "HP" | "DMG";
  quantity: number;
};

/**
 * Result of a successful confirmation/import operation.
 */
export type ScannerConfirmationResult = {
  scanId: string;
  holdingId: string;
  cardName: string;
  setName: string;
  finish: string;
  condition: string;
  quantity: number;
};

/**
 * Adapter interface for resolving printings (editions) of a card.
 * Default implementation uses Scryfall; can be swapped for Cardmarket, TCGplayer, etc.
 */
export interface ScannerPrintingResolver {
  /**
   * Given a card's oracle ID (or scryfall ID of any printing), resolve all available printings.
   */
  resolvePrintings(cardId: string): Promise<ScannerPrintingOption[]>;
}

