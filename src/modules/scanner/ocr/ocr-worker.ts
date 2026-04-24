import Tesseract from "tesseract.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { env } from "@/server/config/env";

const { createWorker, PSM } = Tesseract;

export type OcrFailureStage = "worker_init" | "asset_load" | "ocr_recognize";
export type OcrInitPhase =
  | "idle"
  | "starting"
  | "loading_worker"
  | "loading_core"
  | "loading_language"
  | "ready"
  | "failed";

const WORKER_INIT_TIMEOUT_MS = 10_000;
const LANGUAGE_LOAD_TIMEOUT_MS = 10_000;

type OcrWorkerState = {
  workerPromise: ReturnType<typeof createWorker> | null;
  activeInitId: number;
  cancelledInitIds: Set<number>;
  ready: boolean;
  initializing: boolean;
  initStartedAt: number | null;
  phaseStartedAt: number | null;
  initPhase: OcrInitPhase;
  lastInitDurationMs: number | null;
  lastError: string | null;
  lastFailureStage: OcrFailureStage | null;
};

const state: OcrWorkerState = {
  workerPromise: null,
  activeInitId: 0,
  cancelledInitIds: new Set<number>(),
  ready: false,
  initializing: false,
  initStartedAt: null,
  phaseStartedAt: null,
  initPhase: "idle",
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

function setInitPhase(phase: OcrInitPhase) {
  if (state.initPhase !== phase) {
    state.initPhase = phase;
    state.phaseStartedAt = Date.now();
  }
}

function updatePhaseFromLogger(message: unknown) {
  if (!message || typeof message !== "object") {
    return;
  }
  const status = "status" in message && typeof message.status === "string" ? message.status.toLowerCase() : "";
  if (!status) {
    return;
  }

  if (status.includes("loading tesseract core")) {
    setInitPhase("loading_core");
    return;
  }
  if (status.includes("loading language traineddata")) {
    setInitPhase("loading_language");
    return;
  }
  if (status.includes("initializing tesseract") || status.includes("initialized tesseract")) {
    setInitPhase("loading_language");
  }
}

function getCachePath() {
  return env.SCANNER_TESSERACT_CACHE_PATH || path.join(os.tmpdir(), "tesseract-cache");
}

function buildWorkerOptions() {
  const cachePath = getCachePath();
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
    logger: updatePhaseFromLogger,
  };
}

async function createAndInitializeWorker() {
  setInitPhase("loading_worker");
  const worker = await createWorker("eng", 1, buildWorkerOptions());
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_LINE,
  });
  return worker;
}

function finalizeInitializationError(message: string, failureStage: OcrFailureStage) {
  state.cancelledInitIds.add(state.activeInitId);
  state.lastInitDurationMs = state.initStartedAt ? Date.now() - state.initStartedAt : null;
  state.ready = false;
  state.initializing = false;
  state.lastError = message;
  state.lastFailureStage = failureStage;
  state.workerPromise = null;
  setInitPhase("failed");
}

function ensureInitializationStarted() {
  if (state.workerPromise) {
    return;
  }

  state.activeInitId += 1;
  const initId = state.activeInitId;
  state.initializing = true;
  state.initStartedAt = Date.now();
  state.lastInitDurationMs = null;
  state.lastError = null;
  state.lastFailureStage = null;
  setInitPhase("starting");
  state.workerPromise = createAndInitializeWorker();

  state.workerPromise
    .then(async (worker) => {
      if (state.cancelledInitIds.has(initId) || state.activeInitId !== initId) {
        state.cancelledInitIds.delete(initId);
        await worker.terminate().catch(() => undefined);
        return;
      }

      state.lastInitDurationMs = state.initStartedAt ? Date.now() - state.initStartedAt : null;
      state.ready = true;
      state.initializing = false;
      state.lastError = null;
      state.lastFailureStage = null;
      setInitPhase("ready");
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown OCR worker initialization error";
      const failureStage = detectFailureStage(message);
      finalizeInitializationError(message, failureStage);
      console.error("[Scanner][ocr] Worker initialization failed.", {
        message,
        failureStage,
        langPath: env.SCANNER_TESSERACT_LANG_PATH ?? "default",
        corePath: env.SCANNER_TESSERACT_CORE_PATH ?? "default",
        workerPath: env.SCANNER_TESSERACT_WORKER_PATH ?? "default",
        cachePath: getCachePath(),
      });
    });
}

function enforceInitializationTimeouts() {
  if (!state.initializing || !state.initStartedAt) {
    return;
  }

  const now = Date.now();
  const totalElapsed = now - state.initStartedAt;
  if (totalElapsed > WORKER_INIT_TIMEOUT_MS) {
    finalizeInitializationError(
      `OCR worker initialization timed out after ${WORKER_INIT_TIMEOUT_MS}ms`,
      "worker_init",
    );
    return;
  }

  if (state.initPhase === "loading_language" && state.phaseStartedAt) {
    const languageElapsed = now - state.phaseStartedAt;
    if (languageElapsed > LANGUAGE_LOAD_TIMEOUT_MS) {
      finalizeInitializationError(
        `OCR language load timed out after ${LANGUAGE_LOAD_TIMEOUT_MS}ms`,
        "asset_load",
      );
    }
  }
}

export async function initializeSharedOcrWorker(options?: { timeoutMs?: number }): Promise<{
  ready: boolean;
  initializing: boolean;
  workerInitialized: boolean;
  message?: string;
  failureStage?: OcrFailureStage;
}> {
  const timeoutMs = options?.timeoutMs ?? 1_500;
  ensureInitializationStarted();
  enforceInitializationTimeouts();

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
      enforceInitializationTimeouts();
      if (!state.initializing) {
        return {
          ready: false,
          initializing: false,
          workerInitialized: false,
          message: state.lastError ?? "OCR initialization failed.",
          failureStage: state.lastFailureStage ?? "worker_init",
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
  const initialized = await initializeSharedOcrWorker({ timeoutMs: WORKER_INIT_TIMEOUT_MS });
  if (!initialized.ready || !state.workerPromise) {
    throw new Error(initialized.message ?? "OCR worker unavailable");
  }
  return state.workerPromise;
}

export async function shutdownSharedOcrWorker() {
  const activePromise = state.workerPromise;

  state.cancelledInitIds.add(state.activeInitId);
  state.workerPromise = null;
  state.initializing = false;
  state.ready = false;
  state.initStartedAt = null;
  state.lastInitDurationMs = null;
  state.lastError = null;
  state.lastFailureStage = null;
  setInitPhase("idle");

  if (!activePromise) {
    return;
  }

  try {
    const worker = await activePromise;
    await worker.terminate();
  } catch {
    // Best-effort cleanup for timed-out init attempts.
  }
}

export function getOcrWorkerRuntimeStatus() {
  enforceInitializationTimeouts();

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
    initPhase: state.initPhase,
    workerInitialized: state.ready && Boolean(state.workerPromise),
    lastError: state.lastError,
    failureStage: state.lastFailureStage,
    assetPaths: {
      langPath: env.SCANNER_TESSERACT_LANG_PATH ?? "default",
      corePath: env.SCANNER_TESSERACT_CORE_PATH ?? "default",
      workerPath: env.SCANNER_TESSERACT_WORKER_PATH ?? "default",
      cachePath: getCachePath(),
    },
  };
}
