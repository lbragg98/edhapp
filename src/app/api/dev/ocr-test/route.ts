import { NextResponse } from "next/server";
import { preprocessImageFromFile } from "@/modules/scanner";
import { DefaultRegionDetector } from "@/modules/scanner/infrastructure/detection/default-region-detector";
import { createOcrProvider } from "@/modules/scanner/ocr/providers";
import { getOcrWorkerRuntimeStatus, initializeSharedOcrWorker } from "@/modules/scanner/ocr/ocr-worker";
import type { ScannerRegion } from "@/modules/scanner/domain/scanner-record";
import { requireDiagnosticsAccess, withTimeout } from "@/server/dev/diagnostics-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StepStatus = "pending" | "in_progress" | "ok" | "failed";

function buildSteps() {
  const runtime = getOcrWorkerRuntimeStatus();
  const phase = runtime.initPhase;
  const failed = phase === "failed";
  const ready = phase === "ready";

  const step = (id: string, status: StepStatus, detail?: string) => ({ id, status, detail: detail ?? null });
  return {
    runtime,
    steps: [
      step("starting", ready || failed || phase !== "idle" ? "ok" : "pending", "Initialization requested."),
      step(
        "loading_worker",
        failed
          ? "failed"
          : ready || phase === "loading_core" || phase === "loading_language"
            ? "ok"
            : phase === "starting" || phase === "loading_worker"
              ? "in_progress"
              : "pending",
      ),
      step(
        "loading_core",
        failed
          ? "failed"
          : ready || phase === "loading_language"
            ? "ok"
            : phase === "loading_core"
              ? "in_progress"
              : "pending",
      ),
      step(
        "loading_language",
        failed
          ? "failed"
          : ready
            ? "ok"
            : phase === "loading_language"
              ? "in_progress"
              : "pending",
      ),
      step("ready", ready ? "ok" : failed ? "failed" : "pending", runtime.lastError ?? undefined),
    ],
  };
}

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

function fallbackRegion(): ScannerRegion[] {
  return [
    {
      id: "fallback-name-bar",
      x: 0.05,
      y: 0.04,
      width: 0.9,
      height: 0.16,
      confidence: 0.5,
    },
  ];
}

export async function GET(request: Request) {
  const access = requireDiagnosticsAccess(request);
  if (!access.ok) {
    return access.response;
  }

  const { mode } = createOcrProvider();
  if (mode === "browser") {
    await initializeSharedOcrWorker({ timeoutMs: 5000 });
  }

  const diagnostics = buildSteps();
  return noStoreJson({
    provider: mode,
    runtime: diagnostics.runtime,
    steps: diagnostics.steps,
  });
}

export async function POST(request: Request) {
  const access = requireDiagnosticsAccess(request);
  if (!access.ok) {
    return access.response;
  }

  const startedAt = Date.now();
  const { mode, adapter } = createOcrProvider();
  if (mode === "disabled") {
    return noStoreJson(
      {
        provider: mode,
        error: "OCR provider is disabled.",
      },
      503,
    );
  }

  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File)) {
    return noStoreJson({ error: "Image file is required." }, 400);
  }

  const preprocessed = await preprocessImageFromFile(image);
  if (!preprocessed.image) {
    return noStoreJson({ error: preprocessed.issues[0]?.message ?? "Invalid image." }, 400);
  }

  if (mode === "browser") {
    const init = await initializeSharedOcrWorker({ timeoutMs: 10_000 });
    if (!init.ready) {
      return noStoreJson(
        {
          provider: mode,
          error: init.message ?? "OCR initialization failed.",
          failureStage: init.failureStage ?? "worker_init",
          runtime: getOcrWorkerRuntimeStatus(),
        },
        503,
      );
    }
  }

  const detector = new DefaultRegionDetector();
  const detected = await detector.detect(preprocessed.image);
  const regions = detected.length > 0 ? detected : fallbackRegion();
  const result = await withTimeout(
    adapter.recognize({
      image: preprocessed.image,
      regions,
    }),
    15_000,
    "OCR_RECOGNITION_TIMEOUT",
  ).catch((error) => ({
    status: "timeout" as const,
    regions: [],
    message: error instanceof Error ? error.message : "OCR recognition timed out.",
    workerInitialized: false,
    failureStage: "ocr_recognize" as const,
  }));

  const status = result.status === "ok" ? 200 : result.status === "timeout" ? 504 : 503;
  return noStoreJson(
    {
      provider: mode,
      durationMs: Date.now() - startedAt,
      extractedText: result.regions.map((region) => region.text).join("\n").trim(),
      confidence:
        result.regions.length > 0
          ? Number(
              (
                result.regions.reduce((sum, region) => sum + region.confidence, 0) /
                Math.max(1, result.regions.length)
              ).toFixed(4),
            )
          : 0,
      failureStage: result.failureStage ?? null,
      result,
      runtime: getOcrWorkerRuntimeStatus(),
    },
    status,
  );
}
