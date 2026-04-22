import type { SearchCardsService } from "@/modules/catalog";
import { matchScanCandidates } from "@/modules/scanner/application/match-scan-candidates";
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
      searchCardsService: SearchCardsService;
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

    const extractedText = [input.manualText?.trim() ?? "", ...ocrRegions.map((entry) => entry.text.trim())]
      .filter(Boolean)
      .join("\n");

    const extractionConfidence =
      ocrRegions.length > 0
        ? Number(
            (
              ocrRegions.reduce((sum, entry) => sum + entry.confidence, 0) /
              Math.max(1, ocrRegions.length)
            ).toFixed(4),
          )
        : 0;

    if (ocrRegions.length === 0 && !input.manualText?.trim()) {
      issues.push({
        code: "ocr_unavailable",
        message: "OCR did not return text. Try better lighting, tighter framing, or manual correction text.",
      });
    }

    if (extractedText.length === 0) {
      issues.push({
        code: "ocr_empty",
        message: "No recognizable text extracted from this capture.",
      });
    }

    stages.push({
      stage: "ocr",
      status: extractedText ? "ok" : "warning",
      summary: extractedText ? "Text extracted for candidate matching." : "No text extracted yet.",
    });

    const candidates = extractedText
      ? await matchScanCandidates({
          extractedText,
          extractionConfidence,
          searchCardsService: this.dependencies.searchCardsService,
        })
      : [];

    if (candidates[0] && candidates[0].confidence < 0.62) {
      issues.push({
        code: "low_confidence_match",
        message: "Top candidate has low confidence. Confirm carefully before importing.",
      });
    }

    stages.push({
      stage: "matching",
      status: candidates.length > 0 ? "ok" : "warning",
      summary: candidates.length > 0 ? `${candidates.length} candidate(s) ranked.` : "No confident card candidates found.",
    });

    return {
      scanId: crypto.randomUUID(),
      capturedAt: new Date().toISOString(),
      extractedText,
      extractionConfidence,
      regions,
      candidates,
      issues,
      stages,
    };
  }
}

