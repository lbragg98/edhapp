import { ScannerPipelineService } from "@/modules/scanner/application/scanner-pipeline-service";
import { DefaultRegionDetector } from "@/modules/scanner/infrastructure/detection/default-region-detector";
import { HttpOcrAdapter } from "@/modules/scanner/infrastructure/ocr/http-ocr-adapter";
import { TesseractOcrAdapter } from "@/modules/scanner/ocr/tesseract-ocr-adapter";
import type { ScannerOcrAdapter } from "@/modules/scanner/domain/scanner-record";
import { getOcrWorkerRuntimeStatus, initializeSharedOcrWorker } from "@/modules/scanner/ocr/ocr-worker";
import { env } from "@/server/config/env";

function createOcrAdapter(): ScannerOcrAdapter {
  if (env.SCANNER_OCR_ENDPOINT) {
    return new HttpOcrAdapter({
      endpoint: env.SCANNER_OCR_ENDPOINT,
      ...(env.SCANNER_OCR_API_KEY ? { apiKey: env.SCANNER_OCR_API_KEY } : {}),
    });
  }

  return new TesseractOcrAdapter();
}

export function createScannerPipelineService(userId?: string) {
  void userId;
  return new ScannerPipelineService({
    detector: new DefaultRegionDetector(),
    ocrAdapter: createOcrAdapter(),
  });
}

export async function getScannerOcrRuntimeStatus() {
  if (env.SCANNER_OCR_ENDPOINT) {
    return {
      ready: true,
      initializing: false,
      workerInitialized: true,
      source: "remote" as const,
      lastError: null as string | null,
      failureStage: null as "worker_init" | "asset_load" | "ocr_recognize" | null,
    };
  }

  const initialized = await initializeSharedOcrWorker({ timeoutMs: 8_000 });
  const runtime = getOcrWorkerRuntimeStatus();
  const initializing = runtime.initializing || initialized.initializing;
  const ready = initialized.ready && runtime.ready;

  return {
    ready,
    initializing,
    workerInitialized: runtime.workerInitialized,
    source: "local_tesseract" as const,
    lastError: ready || initializing ? null : runtime.lastError ?? initialized.message ?? null,
    failureStage: ready || initializing ? null : runtime.failureStage ?? initialized.failureStage ?? null,
  };
}
