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

    const regions = await this.dependencies.detector.detect(input.image);
    stages.push({
      stage: "region_detection",
      status: regions.length > 0 ? "ok" : "warning",
      summary: regions.length > 0 ? `${regions.length} candidate region(s) found.` : "No candidate regions detected.",
    });

    const ocrRegions = await this.dependencies.ocrAdapter.recognize({
      image: input.image,
      regions,
    });

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
      issues.push({
        code: "ocr_timeout",
        message: ocrRegions.message ?? "OCR timed out while reading the image.",
      });
    }

    if (ocrRegions.status === "unavailable" || ocrRegions.status === "error") {
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

    const resolved = likelyCardName
      ? await resolveCardCandidate({
          extractedText: likelyCardName,
          extractionConfidence,
        })
      : {
          status: "failed" as const,
          candidates: [],
        };

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
    };
  }
}
