import { extractLikelyCardName, normalizeOcrText } from "@/modules/scanner/ocr/normalize-ocr-text";
import { resolveCardCandidate } from "@/modules/scanner/recognition/resolve-card-candidate";
import type {
  ScannerIssue,
  ScannerScanInput,
  ScannerScanResult,
  ScannerRegionDetector,
  ScannerOcrAdapter,
  ScannerStageReport,
} from "@/modules/scanner/domain/scanner-record";

const MATCHING_TIMEOUT_MS = 4_500;

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, code: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(code));
    }, timeoutMs);

    operation
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export class ScannerPipelineService {
  constructor(
    private readonly dependencies: {
      detector: ScannerRegionDetector;
      ocrAdapter: ScannerOcrAdapter;
    },
  ) {}

  async execute(input: ScannerScanInput): Promise<ScannerScanResult> {
    const stages: ScannerStageReport[] = [];
    const issues: ScannerIssue[] = [];

    stages.push({
      stage: "capture",
      status: "ok",
      summary: `Image captured (${input.image.mimeType}).`,
    });

    let timeoutStage:
      | "worker_init"
      | "asset_load"
      | "ocr_recognize"
      | "local_match"
      | "scryfall_match"
      | "network"
      | null = null;
    const regions = await this.dependencies.detector.detect(input.image);
    stages.push({
      stage: "region_detection",
      status: regions.length > 0 ? "ok" : "warning",
      summary: regions.length > 0 ? `${regions.length} candidate region(s) found.` : "No candidate regions detected.",
    });

    const ocrStartedAt = Date.now();
    const ocrRegions = await this.dependencies.ocrAdapter.recognize({
      image: input.image,
      regions,
    });
    const ocrDurationMs = Date.now() - ocrStartedAt;

    const extractedText = [input.manualText?.trim() ?? "", ...ocrRegions.regions.map((entry) => entry.text.trim())]
      .filter(Boolean)
      .join("\n");
    const normalizedText = normalizeOcrText(extractedText);
    const likelyCardName = extractLikelyCardName(normalizedText);

    const extractionConfidence =
      ocrRegions.regions.length > 0
        ? Number(
            (
              ocrRegions.regions.reduce((sum, entry) => sum + entry.confidence, 0) /
              Math.max(1, ocrRegions.regions.length)
            ).toFixed(4),
          )
        : 0;

    if (ocrRegions.status === "timeout") {
      timeoutStage = ocrRegions.failureStage ?? "ocr_recognize";
      issues.push({
        code: "ocr_timeout",
        message: ocrRegions.message ?? "OCR timed out while reading the image.",
      });
    }

    if (ocrRegions.status === "unavailable" || ocrRegions.status === "error") {
      if (ocrRegions.failureStage) {
        timeoutStage = ocrRegions.failureStage;
      }
      issues.push({
        code: "ocr_unavailable",
        message:
          ocrRegions.message ?? "OCR service is unavailable. Retry with manual hints or check scanner configuration.",
      });
    }

    if (extractedText.length === 0 && !input.manualText?.trim()) {
      issues.push({
        code: "no_text_detected",
        message: "No recognizable name text was detected in the name bar crop.",
      });
    }

    stages.push({
      stage: "ocr",
      status: extractedText ? "ok" : ocrRegions.status === "timeout" ? "error" : "warning",
      summary: extractedText
        ? "Text extracted for candidate matching."
        : ocrRegions.message ?? "No text extracted yet.",
    });

    const matchingStartedAt = Date.now();
    let resolved:
      | Awaited<ReturnType<typeof resolveCardCandidate>>
      | {
          status: "failed";
          candidates: [];
        } = {
      status: "failed",
      candidates: [],
    };

    if (likelyCardName) {
      try {
        resolved = await withTimeout(
          resolveCardCandidate({
            extractedText: likelyCardName,
            extractionConfidence,
          }),
          MATCHING_TIMEOUT_MS,
          "MATCHING_TIMEOUT",
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "matching_failed";
        if (message === "MATCHING_TIMEOUT" || message === "LOCAL_MATCH_TIMEOUT") {
          timeoutStage = "local_match";
        } else if (message === "SCRYFALL_MATCH_TIMEOUT") {
          timeoutStage = "scryfall_match";
        } else if (message.toLowerCase().includes("aborted")) {
          timeoutStage = "network";
        }
      }
    }
    const matchingDurationMs = Date.now() - matchingStartedAt;

    const candidates = resolved.candidates;

    if (resolved.status === "failed") {
      issues.push({
        code: "candidate_match_failed",
        message: "Card matching failed. Try rescanning or use manual search.",
      });
    }

    if (candidates[0] && candidates[0].confidence < 0.62) {
      issues.push({
        code: "low_confidence_match",
        message: "Top candidate has low confidence. Confirm carefully before importing.",
      });
    }

    if (!extractedText && input.manualText?.trim()) {
      issues.push({
        code: "ocr_empty",
        message: "OCR was empty, but manual hint text was used for matching.",
      });
    }

    stages.push({
      stage: "matching",
      status: candidates.length > 0 ? "ok" : "warning",
      summary:
        candidates.length > 0
          ? `${candidates.length} candidate(s) ranked (${resolved.status}).`
          : timeoutStage === "local_match" || timeoutStage === "scryfall_match"
            ? "Candidate matching timed out."
            : "No confident card candidates found.",
    });

    return {
      scanId: crypto.randomUUID(),
      capturedAt: new Date().toISOString(),
      extractedText: normalizedText,
      extractionConfidence,
      regions,
      candidates,
      issues,
      stages,
      diagnostics: {
        ocrDurationMs,
        matchingDurationMs,
        workerInitialized: ocrRegions.workerInitialized ?? false,
        primaryCrop: ocrRegions.regions[0]
          ? { width: ocrRegions.regions[0].cropWidth, height: ocrRegions.regions[0].cropHeight }
          : null,
        timeoutStage,
      },
    };
  }
}
