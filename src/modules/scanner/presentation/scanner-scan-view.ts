import { z } from "zod";
import type { ScannerScanResult } from "@/modules/scanner/domain/scanner-record";

const scannerCandidateViewSchema = z.object({
  card: z.object({
    id: z.string(),
    oracleId: z.string(),
    name: z.string(),
    manaCost: z.string().nullable(),
    typeLine: z.string(),
    oracleText: z.string().nullable(),
    imageUri: z.string().nullable(),
    colorIdentity: z.array(z.string()),
    cmc: z.number(),
    legalCommander: z.boolean(),
    price: z
      .object({
        source: z.literal("scryfall"),
        capturedAt: z.string().nullable(),
        usd: z.number().nullable(),
        usdFoil: z.number().nullable(),
        usdEtched: z.number().nullable(),
        eur: z.number().nullable(),
        eurFoil: z.number().nullable(),
        tix: z.number().nullable(),
      })
      .nullable(),
  }),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()),
});

const scannerScanViewSchema = z.object({
  scanId: z.string(),
  capturedAt: z.string(),
  extractedText: z.string(),
  extractionConfidence: z.number().min(0).max(1),
  regions: z.array(
    z.object({
      id: z.string(),
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      confidence: z.number(),
    }),
  ),
  candidates: z.array(scannerCandidateViewSchema),
  issues: z.array(
    z.object({
      code: z.enum([
        "camera_unavailable",
        "image_missing",
        "image_invalid",
        "scan_error",
        "ocr_unavailable",
        "ocr_timeout",
        "ocr_empty",
        "no_text_detected",
        "candidate_match_failed",
        "low_confidence_match",
      ]),
      message: z.string(),
    }),
  ),
  stages: z.array(
    z.object({
      stage: z.enum(["capture", "region_detection", "ocr", "matching"]),
      status: z.enum(["ok", "warning", "error"]),
      summary: z.string(),
    }),
  ),
  diagnostics: z.object({
    ocrDurationMs: z.number(),
    matchingDurationMs: z.number(),
    workerInitialized: z.boolean(),
    primaryCrop: z
      .object({
        width: z.number(),
        height: z.number(),
      })
      .nullable(),
    timeoutStage: z.enum(["ocr", "matching"]).nullable(),
  }),
});

export function toScannerScanView(result: ScannerScanResult) {
  return scannerScanViewSchema.parse(result);
}
