import Tesseract from "tesseract.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { env } from "@/server/config/env";

const { createWorker, PSM } = Tesseract;

type OcrFailureStage = "worker_init" | "asset_load" | "ocr_recognize";
const OCR_INIT_MAX_WAIT_MS = 15_000;

type OcrWorkerState = {
  workerPromise: ReturnType<typeof createWorker> | null;
  ready: boolean;
  initializing: boolean;
  initStartedAt: number | null;
  lastInitDurationMs: number | null;
  lastError: string | null;
  lastFailureStage: OcrFailureStage | null;
};

const state: OcrWorkerState = {
  workerPromise: null,
  ready: false,
  initializing: false,
  initStartedAt: null,
  lastInitDurationMs: null,
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
  const cachePath = env.SCANNER_TESSERACT_CACHE_PATH || path.join(os.tmpdir(), "tesseract-cache");
  try {
    fs.mkdirSync(cachePath, { recursive: true });
  } catch (error) {
    console.warn("[Scanner][ocr] Failed to ensure Tesseract cache path; falling back to library default.", {
      cachePath,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return {
    ...(env.SCANNER_TESSERACT_LANG_PATH ? { langPath: env.SCANNER_TESSERACT_LANG_PATH } : {}),
    ...(env.SCANNER_TESSERACT_CORE_PATH ? { corePath: env.SCANNER_TESSERACT_CORE_PATH } : {}),
    ...(env.SCANNER_TESSERACT_WORKER_PATH ? { workerPath: env.SCANNER_TESSERACT_WORKER_PATH } : {}),
    cachePath,
  };
}

async function createAndInitializeWorker() {
  const worker = await createWorker("eng", 1, buildWorkerOptions());
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_LINE,
  });
  return worker;
}

function ensureInitializationStarted() {
  if (state.workerPromise) {
    return;
  }

  state.initializing = true;
  state.initStartedAt = Date.now();
  state.lastInitDurationMs = null;
  state.lastError = null;
  state.lastFailureStage = null;
  state.workerPromise = createAndInitializeWorker();

  state.workerPromise
    .then(() => {
      state.lastInitDurationMs = state.initStartedAt ? Date.now() - state.initStartedAt : null;
      state.ready = true;
      state.initializing = false;
      state.lastError = null;
      state.lastFailureStage = null;
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown OCR worker initialization error";
      const failureStage = detectFailureStage(message);
      state.lastInitDurationMs = state.initStartedAt ? Date.now() - state.initStartedAt : null;
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
        cachePath: env.SCANNER_TESSERACT_CACHE_PATH ?? path.join(os.tmpdir(), "tesseract-cache"),
      });
    });
}

export async function initializeSharedOcrWorker(options?: { timeoutMs?: number }): Promise<{
  ready: boolean;
  initializing: boolean;
  workerInitialized: boolean;
  message?: string;
  failureStage?: OcrFailureStage;
}> {
  const timeoutMs = options?.timeoutMs ?? 12_000;
  ensureInitializationStarted();

  if (!state.workerPromise) {
    return {
      ready: false,
      initializing: false,
      workerInitialized: false,
      message: state.lastError ?? "OCR worker unavailable.",
      failureStage: state.lastFailureStage ?? "worker_init",
    };
  }

  if (state.ready) {
    return { ready: true, initializing: false, workerInitialized: true };
  }

  try {
    await withTimeout(state.workerPromise, timeoutMs, "OCR_WORKER_INIT_TIMEOUT");
    return { ready: true, initializing: false, workerInitialized: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OCR worker initialization error";
    if (message === "OCR_WORKER_INIT_TIMEOUT") {
      const elapsedMs = state.initStartedAt ? Date.now() - state.initStartedAt : timeoutMs;
      if (elapsedMs >= OCR_INIT_MAX_WAIT_MS) {
        state.ready = false;
        state.initializing = false;
        state.workerPromise = null;
        state.lastFailureStage = "worker_init";
        state.lastInitDurationMs = elapsedMs;
        state.lastError = `OCR worker initialization timed out after ${elapsedMs}ms`;
        return {
          ready: false,
          initializing: false,
          workerInitialized: false,
          message: state.lastError,
          failureStage: "worker_init",
        };
      }

      return {
        ready: false,
        initializing: true,
        workerInitialized: false,
        message: "OCR engine is still initializing.",
        failureStage: "worker_init",
      };
    }

    return {
      ready: false,
      initializing: false,
      workerInitialized: false,
      message: state.lastError ?? message,
      failureStage: state.lastFailureStage ?? detectFailureStage(message),
    };
  }
}

export async function getSharedOcrWorker() {
  const initialized = await initializeSharedOcrWorker({ timeoutMs: 45_000 });
  if (!initialized.ready || !state.workerPromise) {
    throw new Error(initialized.message ?? "OCR worker unavailable");
  }
  return state.workerPromise;
}

export function getOcrWorkerRuntimeStatus() {
  const cachePath = env.SCANNER_TESSERACT_CACHE_PATH || path.join(os.tmpdir(), "tesseract-cache");
  const initDurationMs = state.initStartedAt
    ? state.ready || !state.initializing
      ? (state.lastInitDurationMs ?? Date.now() - state.initStartedAt)
      : Date.now() - state.initStartedAt
    : null;

  return {
    ready: state.ready,
    initializing: state.initializing,
    initStartedAt: state.initStartedAt,
    initDurationMs,
    lastInitDurationMs: state.lastInitDurationMs,
    workerInitialized: state.ready && Boolean(state.workerPromise),
    lastError: state.lastError,
    failureStage: state.lastFailureStage,
    assetPaths: {
      langPath: env.SCANNER_TESSERACT_LANG_PATH ?? "default",
      corePath: env.SCANNER_TESSERACT_CORE_PATH ?? "default",
      workerPath: env.SCANNER_TESSERACT_WORKER_PATH ?? "default",
      cachePath,
    },
  };
}
