"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type StepStatus = "pending" | "in_progress" | "ok" | "failed";

type RuntimePayload = {
  provider: "browser" | "server" | "disabled";
  runtime: {
    initPhase: string;
    initDurationMs: number | null;
    lastError: string | null;
    failureStage: string | null;
    assetPaths: {
      workerPath: string;
      corePath: string;
      langPath: string;
      cachePath: string;
    };
  };
  steps: Array<{ id: string; status: StepStatus; detail: string | null }>;
};

export function OcrTestClient() {
  const [status, setStatus] = useState<RuntimePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/dev/ocr-test?ts=${Date.now()}`, { cache: "no-store" });
    const payload = (await response.json()) as RuntimePayload;
    setStatus(payload);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    async function poll() {
      const response = await fetch(`/api/dev/ocr-test?ts=${Date.now()}`, { cache: "no-store" });
      const payload = (await response.json()) as RuntimePayload;
      if (!active) return;
      setStatus(payload);
      setLoading(false);
      if (payload.runtime.initPhase !== "ready" && payload.runtime.initPhase !== "failed") {
        setTimeout(poll, 1000);
      }
    }

    void poll();
    return () => {
      active = false;
    };
  }, []);

  const stepClass = useCallback((s: StepStatus) => {
    if (s === "ok") return "border-emerald-400/30 text-emerald-200";
    if (s === "failed") return "border-rose-400/30 text-rose-200";
    if (s === "in_progress") return "border-amber-400/30 text-amber-200";
    return "border-[color:var(--surface-border)] text-[color:var(--text-subtle)]";
  }, []);

  const canUpload = useMemo(() => Boolean(uploadFile && !uploading), [uploadFile, uploading]);

  return (
    <section className="mt-5 space-y-5">
      <div className="surface-panel p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="type-label">Initialization Steps</p>
          <button type="button" className="nav-link" onClick={() => void fetchStatus()} disabled={loading}>
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="mt-3 text-sm text-[color:var(--text-subtle)]">Loading OCR diagnostics...</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {status?.steps.map((step) => (
                <span key={step.id} className={`rounded-full border px-3 py-1 text-xs ${stepClass(step.status)}`}>
                  {step.id.replaceAll("_", " ")}
                </span>
              ))}
            </div>
            <div className="mt-4 space-y-1 text-xs text-[color:var(--text-subtle)]">
              <p>Provider: {status?.provider ?? "(unknown)"}</p>
              <p>Init phase: {status?.runtime.initPhase ?? "(unknown)"}</p>
              <p>Init duration: {status?.runtime.initDurationMs !== null ? `${status?.runtime.initDurationMs}ms` : "(n/a)"}</p>
              <p>Failure stage: {status?.runtime.failureStage ?? "(none)"}</p>
              <p>Worker path: {status?.runtime.assetPaths.workerPath ?? "(n/a)"}</p>
              <p>Core path: {status?.runtime.assetPaths.corePath ?? "(n/a)"}</p>
              <p>Lang path: {status?.runtime.assetPaths.langPath ?? "(n/a)"}</p>
              <p>Cache path: {status?.runtime.assetPaths.cachePath ?? "(n/a)"}</p>
              {status?.runtime.lastError ? <p className="text-rose-300">Last error: {status.runtime.lastError}</p> : null}
            </div>
          </>
        )}
      </div>

      <div className="surface-panel p-5 sm:p-6">
        <p className="type-label">Upload OCR Test</p>
        <p className="mt-2 text-sm text-[color:var(--text-subtle)]">
          Upload a clean card-name crop (e.g. Mana Geyser) to test OCR in isolation.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setUploadFile(file);
              setUploadResult("");
              setUploadError("");
            }}
          />
          <button
            type="button"
            className="nav-link nav-link-active"
            disabled={!canUpload}
            onClick={async () => {
              if (!uploadFile) return;
              setUploading(true);
              setUploadResult("");
              setUploadError("");
              try {
                const form = new FormData();
                form.set("image", uploadFile);
                const response = await fetch("/api/dev/ocr-test", {
                  method: "POST",
                  body: form,
                });
                const payload = (await response.json()) as {
                  error?: string;
                  result?: {
                    status: string;
                    message?: string;
                    regions: Array<{ text: string; confidence: number }>;
                  };
                  runtime?: { lastError?: string | null };
                };
                if (!response.ok) {
                  setUploadError(payload.error ?? payload.result?.message ?? payload.runtime?.lastError ?? "OCR test failed.");
                } else {
                  const text = payload.result?.regions.map((r) => `${r.text} (${Math.round(r.confidence * 100)}%)`).join("\n");
                  setUploadResult(text || "(No OCR text returned)");
                }
              } catch (error) {
                setUploadError(error instanceof Error ? error.message : "OCR test request failed.");
              } finally {
                setUploading(false);
                void fetchStatus();
              }
            }}
          >
            {uploading ? "Testing..." : "Run OCR Test"}
          </button>
        </div>

        {uploadResult ? (
          <pre className="mt-4 overflow-x-auto rounded-xl border border-emerald-400/30 bg-emerald-500/[0.06] p-3 text-xs text-emerald-100">
            {uploadResult}
          </pre>
        ) : null}
        {uploadError ? (
          <pre className="mt-4 overflow-x-auto rounded-xl border border-rose-400/30 bg-rose-500/[0.06] p-3 text-xs text-rose-100">
            {uploadError}
          </pre>
        ) : null}
      </div>
    </section>
  );
}

