import { createSearchCardsService } from "@/modules/catalog";
import { ScannerPipelineService } from "@/modules/scanner/application/scanner-pipeline-service";
import { DefaultRegionDetector } from "@/modules/scanner/infrastructure/detection/default-region-detector";
import { HttpOcrAdapter } from "@/modules/scanner/infrastructure/ocr/http-ocr-adapter";
import { NoopOcrAdapter } from "@/modules/scanner/infrastructure/ocr/noop-ocr-adapter";
import type { ScannerOcrAdapter } from "@/modules/scanner/domain/scanner-record";
import { env } from "@/server/config/env";

function createOcrAdapter(): ScannerOcrAdapter {
  if (env.SCANNER_OCR_ENDPOINT) {
    return new HttpOcrAdapter({
      endpoint: env.SCANNER_OCR_ENDPOINT,
      ...(env.SCANNER_OCR_API_KEY ? { apiKey: env.SCANNER_OCR_API_KEY } : {}),
    });
  }

  return new NoopOcrAdapter();
}

export function createScannerPipelineService(userId?: string) {
  return new ScannerPipelineService({
    detector: new DefaultRegionDetector(),
    ocrAdapter: createOcrAdapter(),
    searchCardsService: createSearchCardsService(userId),
  });
}
