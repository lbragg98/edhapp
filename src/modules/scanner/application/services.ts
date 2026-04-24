import { ScannerPipelineService } from "@/modules/scanner/application/scanner-pipeline-service";
import { DefaultRegionDetector } from "@/modules/scanner/infrastructure/detection/default-region-detector";
import type { ScannerOcrAdapter } from "@/modules/scanner/domain/scanner-record";
import { createOcrProvider, resolveOcrProviderMode } from "@/modules/scanner/ocr/providers";
import { getOcrWorkerRuntimeStatus, initializeSharedOcrWorker } from "@/modules/scanner/ocr/ocr-worker";
import { env } from "@/server/config/env";

function createOcrAdapter(): ScannerOcrAdapter {
  return createOcrProvider().adapter;
}

export function createScannerPipelineService(userId?: string) {
  void userId;
  return new ScannerPipelineService({
    detector: new DefaultRegionDetector(),
    ocrAdapter: createOcrAdapter(),
  });
}

export async function getScannerOcrRuntimeStatus() {
  const mode = resolveOcrProviderMode();

  if (mode === "disabled") {
    return {
      ready: false,
      initializing: false,
      workerInitialized: false,
      source: "disabled" as const,
      provider: mode,
      lastError: "OCR provider disabled. Use manual search fallback.",
      failureStage: "worker_init" as const,
      initDurationMs: null as number | null,
      assetPaths: {
        langPath: "disabled",
        corePath: "disabled",
        workerPath: "disabled",
        cachePath: "disabled",
      },
      initPhase: "failed" as const,
    };
  }

  if (mode === "server") {
    return {
      ready: Boolean(env.SCANNER_OCR_ENDPOINT),
      initializing: false,
      workerInitialized: Boolean(env.SCANNER_OCR_ENDPOINT),
      source: "remote" as const,
      provider: mode,
      lastError: env.SCANNER_OCR_ENDPOINT ? null : "SCANNER_OCR_ENDPOINT is not configured.",
      failureStage: env.SCANNER_OCR_ENDPOINT ? null : ("network" as const),
      initDurationMs: null as number | null,
      assetPaths: {
        langPath: "remote",
        corePath: "remote",
        workerPath: env.SCANNER_OCR_ENDPOINT ?? "missing",
        cachePath: "remote",
      },
      initPhase: env.SCANNER_OCR_ENDPOINT ? ("ready" as const) : ("failed" as const),
    };
  }

  const initialized = await initializeSharedOcrWorker({ timeoutMs: 500 });
  const runtime = getOcrWorkerRuntimeStatus();
  const initializing = runtime.initializing || initialized.initializing;
  const ready = initialized.ready && runtime.ready;

  return {
    ready,
    initializing,
    workerInitialized: runtime.workerInitialized,
    source: "local_tesseract" as const,
    provider: mode,
    lastError: ready || initializing ? null : runtime.lastError ?? initialized.message ?? null,
    failureStage: ready || initializing ? null : runtime.failureStage ?? initialized.failureStage ?? null,
    initDurationMs: runtime.initDurationMs ?? null,
    assetPaths: runtime.assetPaths,
    initPhase: runtime.initPhase,
  };
}
