import { NextResponse } from "next/server";
import { preprocessImageFromFile } from "@/modules/scanner";
import { DefaultRegionDetector } from "@/modules/scanner/infrastructure/detection/default-region-detector";
import { createOcrProvider } from "@/modules/scanner/ocr/providers";
import { getOcrWorkerRuntimeStatus, initializeSharedOcrWorker } from "@/modules/scanner/ocr/ocr-worker";
import type { ScannerRegion } from "@/modules/scanner/domain/scanner-record";

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

export async function GET() {
  const { mode } = createOcrProvider();
  if (mode === "browser") {
    await initializeSharedOcrWorker({ timeoutMs: 500 });
  }

  const diagnostics = buildSteps();
  return noStoreJson({
    provider: mode,
    runtime: diagnostics.runtime,
    steps: diagnostics.steps,
  });
}

export async function POST(request: Request) {
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
  const result = await adapter.recognize({
    image: preprocessed.image,
    regions,
  });

  const status = result.status === "ok" ? 200 : result.status === "timeout" ? 504 : 503;
  return noStoreJson(
    {
      provider: mode,
      result,
      runtime: getOcrWorkerRuntimeStatus(),
    },
    status,
  );
}

