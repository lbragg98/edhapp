import Tesseract from "tesseract.js";
import { env } from "@/server/config/env";

const { createWorker, PSM } = Tesseract;

type OcrFailureStage = "worker_init" | "asset_load" | "ocr_recognize";

type OcrWorkerState = {
  workerPromise: ReturnType<typeof createWorker> | null;
  ready: boolean;
  initializing: boolean;
  lastError: string | null;
  lastFailureStage: OcrFailureStage | null;
};

const state: OcrWorkerState = {
  workerPromise: null,
  ready: false,
  initializing: false,
  lastError: null,
  lastFailureStage: null,
};

function withTimeout<T>(operation: Promise<T>, timeoutMs: number, code: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(code)), timeoutMs);

    operation
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function detectFailureStage(message: string): OcrFailureStage {
  const lower = message.toLowerCase();
  if (
    lower.includes("traineddata")
    || lower.includes("lang")
    || lower.includes("wasm")
    || lower.includes("worker")
    || lower.includes("fetch")
    || lower.includes("network")
  ) {
    return "asset_load";
  }

  return "worker_init";
}

function buildWorkerOptions() {
  return {
    ...(env.SCANNER_TESSERACT_LANG_PATH ? { langPath: env.SCANNER_TESSERACT_LANG_PATH } : {}),
    ...(env.SCANNER_TESSERACT_CORE_PATH ? { corePath: env.SCANNER_TESSERACT_CORE_PATH } : {}),
    ...(env.SCANNER_TESSERACT_WORKER_PATH ? { workerPath: env.SCANNER_TESSERACT_WORKER_PATH } : {}),
  };
}

async function createAndInitializeWorker() {
  const worker = await createWorker("eng", 1, buildWorkerOptions());
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_LINE,
  });
  return worker;
}

export async function initializeSharedOcrWorker(options?: { timeoutMs?: number }): Promise<{
  ready: boolean;
  workerInitialized: boolean;
  message?: string;
  failureStage?: OcrFailureStage;
}> {
  const timeoutMs = options?.timeoutMs ?? 8_000;

  if (!state.workerPromise) {
    state.initializing = true;
    state.workerPromise = createAndInitializeWorker();
  }

  try {
    await withTimeout(state.workerPromise, timeoutMs, "OCR_WORKER_INIT_TIMEOUT");
    state.ready = true;
    state.initializing = false;
    state.lastError = null;
    state.lastFailureStage = null;
    return { ready: true, workerInitialized: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OCR worker initialization error";
    const failureStage = message === "OCR_WORKER_INIT_TIMEOUT" ? "worker_init" : detectFailureStage(message);
    state.ready = false;
    state.initializing = false;
    state.lastError = message;
    state.lastFailureStage = failureStage;
    state.workerPromise = null;

    console.error("[Scanner][ocr] Worker initialization failed.", {
      message,
      failureStage,
      langPath: env.SCANNER_TESSERACT_LANG_PATH ?? "default",
      corePath: env.SCANNER_TESSERACT_CORE_PATH ?? "default",
      workerPath: env.SCANNER_TESSERACT_WORKER_PATH ?? "default",
    });

    return {
      ready: false,
      workerInitialized: false,
      message,
      failureStage,
    };
  }
}

export async function getSharedOcrWorker() {
  const initialized = await initializeSharedOcrWorker();
  if (!initialized.ready || !state.workerPromise) {
    throw new Error(initialized.message ?? "OCR worker unavailable");
  }
  return state.workerPromise;
}

export function getOcrWorkerRuntimeStatus() {
  return {
    ready: state.ready,
    initializing: state.initializing,
    workerInitialized: state.ready && Boolean(state.workerPromise),
    lastError: state.lastError,
    failureStage: state.lastFailureStage,
  };
}

