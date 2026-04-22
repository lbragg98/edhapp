import type { CardListItem } from "@/modules/catalog";

export type ScannerIssueCode =
  | "image_missing"
  | "image_invalid"
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

