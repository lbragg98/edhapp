"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Library } from "lucide-react";
import type { ScannerConfirmationResult, ScannerIssue } from "@/modules/scanner";
import { useCameraPermissions } from "@/modules/scanner/presentation/use-camera-permissions";
import type { CompressionResult } from "@/modules/scanner/application/compress-image";
import { formatPercentRatio, formatUsd } from "@/modules/pricing";
import { parseCardSearchResultResponse, toCardSelectionItems, type CardSelectionItem } from "@/modules/catalog";
import {
  addPendingImport,
  removePendingImport,
  type PendingImportState,
} from "@/modules/scanner/import/pending-import-store";
import { ScannerConfirmationPanel } from "@/components/scanner/scanner-confirmation-panel";
import { ScannerCaptureZone } from "@/components/scanner/scanner-capture-zone";
import { ScannerErrorPanel } from "@/components/scanner/scanner-error-panel";
import { ScannerProgress } from "@/components/scanner/scanner-progress";
import { CardPreviewThumbnail } from "@/components/cards/card-preview";
import { broadcastLibraryInvalidation } from "@/lib/library-sync";

type ScanStage = "upload" | "preprocessing" | "ocr" | "matching" | "complete";
type CaptureSource = "upload" | "capture" | "live";
type ScannerLoopState =
  | "camera-active"
  | "reading"
  | "no-text-detected"
  | "low-confidence"
  | "candidate-found"
  | "added-to-pending"
  | "timeout"
  | "error";

type ScannerDebugState = {
  lastOcrText: string;
  lastConfidence: number | null;
  lastCandidate: string | null;
  lastError: string | null;
  lastProcessingMs: number | null;
};

type ScannerCandidate = {
  card: {
    id: string;
    oracleId: string;
    name: string;
    manaCost: string | null;
    typeLine: string;
    oracleText: string | null;
    colorIdentity: string[];
    cmc: number;
    legalCommander: boolean;
    imageUri: string | null;
    price: {
      usd: number | null;
    } | null;
  };
  confidence: number;
  reasons: string[];
};

type ScannerStage = {
  stage: "capture" | "region_detection" | "ocr" | "matching";
  status: "ok" | "warning" | "error";
  summary: string;
};

type ScannerResponse = {
  scanId: string;
  capturedAt: string;
  extractedText: string;
  extractionConfidence: number;
  candidates: ScannerCandidate[];
  issues: ScannerIssue[];
  stages: ScannerStage[];
};

const stageLabel: Record<ScannerStage["stage"], string> = {
  capture: "Capture",
  region_detection: "Region",
  ocr: "OCR",
  matching: "Matching",
};

function statusClass(status: ScannerStage["status"]): string {
  if (status === "ok") return "border-emerald-500/30 text-emerald-200";
  if (status === "warning") return "border-amber-500/30 text-amber-200";
  return "border-rose-500/30 text-rose-200";
}

export function ScannerWorkspace() {
  // Camera permissions
  const { capabilities, isDetecting, error: cameraError, requestPermission, refresh } = useCameraPermissions();

  // File and preview state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);
  const [manualText, setManualText] = useState("");

  // Scan state
  const [scan, setScan] = useState<ScannerResponse | null>(null);
  const [issues, setIssues] = useState<ScannerIssue[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStage, setScanStage] = useState<ScanStage>("upload");
  const [scanError, setScanError] = useState<string | null>(null);

  // Confirmation flow state
  const [confirmingCandidate, setConfirmingCandidate] = useState<ScannerCandidate | null>(null);
  const [lastImport, setLastImport] = useState<ScannerConfirmationResult | null>(null);
  const [manualSearch, setManualSearch] = useState("");
  const [manualSearchResults, setManualSearchResults] = useState<CardSelectionItem[]>([]);
  const [manualSearchLoading, setManualSearchLoading] = useState(false);
  const [pendingImports, setPendingImports] = useState<PendingImportState>({ items: [] });
  const [loopState, setLoopState] = useState<ScannerLoopState>("camera-active");
  const [cameraState, setCameraState] = useState<string>("idle");
  const [debugState, setDebugState] = useState<ScannerDebugState>({
    lastOcrText: "",
    lastConfidence: null,
    lastCandidate: null,
    lastError: null,
    lastProcessingMs: null,
  });

  // Refs for scroll behavior
  const resultsRef = useRef<HTMLElement>(null);
  const manualInputRef = useRef<HTMLTextAreaElement>(null);
  const scanInFlightRef = useRef(false);

  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile]
  );
  const topConfidence = scan?.candidates[0]?.confidence ?? 0;
  const needsManualFallback = scan ? scan.candidates.length === 0 || topConfidence < 0.62 : false;
  const normalizedManualSearch = useMemo(() => manualSearch.trim(), [manualSearch]);
  const canRunManualSearch = needsManualFallback && normalizedManualSearch.length >= 2;
  const visibleManualSearchResults = canRunManualSearch ? manualSearchResults : [];
  const showManualSearchLoading = canRunManualSearch && manualSearchLoading;

  const handleFileSelected = useCallback((file: File, compression: CompressionResult, source: CaptureSource) => {
    setSelectedFile(file);
    setCompressionInfo(compression);
    if (source !== "live") {
      // Clear previous scan results for manual upload/snap actions.
      setScan(null);
      setIssues([]);
      setScanError(null);
    }
  }, []);

  const handleRetake = useCallback(() => {
    setSelectedFile(null);
    setCompressionInfo(null);
    setScan(null);
    setIssues([]);
    setScanError(null);
    setManualText("");
    setManualSearch("");
    setManualSearchResults([]);
  }, []);

  const handleAdjustAndRetry = useCallback(() => {
    // Focus on manual text input for OCR hints
    manualInputRef.current?.focus();
    manualInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const runScan = useCallback(async (fileToScan?: File) => {
    const targetFile = fileToScan ?? selectedFile;
    if (!targetFile) {
      setIssues([{ code: "image_missing", message: "Capture or upload an image first." }]);
      return;
    }
    if (scanInFlightRef.current) {
      return;
    }

    scanInFlightRef.current = true;
    setIsScanning(true);
    setLoopState("reading");
    setIssues([]);
    setScanError(null);
    setScanStage("upload");
    setManualSearchResults([]);
    const startedAt = performance.now();

    const form = new FormData();
    form.set("image", targetFile);
    if (manualText.trim()) {
      form.set("manualText", manualText.trim());
    }

    try {
      // Simulate stage progression (in reality, server would stream these)
      setScanStage("preprocessing");
      await new Promise((r) => setTimeout(r, 300));

      setScanStage("ocr");
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 10_000);
      let response: Response;
      try {
        response = await fetch("/api/scanner/scan", {
          method: "POST",
          body: form,
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeout);
      }

      setScanStage("matching");

      const payload = (await response.json()) as {
        data?: ScannerResponse & { issues?: ScannerIssue[] };
        error?: string;
      };

      if (!response.ok) {
        setScan(null);
        const message = payload.error ?? "Scan failed.";
        setScanError(message);
        setIssues(payload.data?.issues ?? [{ code: "scan_error", message }]);
        setLoopState("error");
        setDebugState((current) => ({
          ...current,
          lastError: message,
          lastProcessingMs: Math.round(performance.now() - startedAt),
        }));
        setIsScanning(false);
        scanInFlightRef.current = false;
        return;
      }

      if (!payload.data) {
        setScan(null);
        setScanError("No scan data returned.");
        setIssues([{ code: "scan_error", message: "No scan data returned." }]);
        setLoopState("error");
        setDebugState((current) => ({
          ...current,
          lastError: "No scan data returned.",
          lastProcessingMs: Math.round(performance.now() - startedAt),
        }));
        setIsScanning(false);
        scanInFlightRef.current = false;
        return;
      }

      setScanStage("complete");
      setScan(payload.data);
      setIssues(payload.data.issues ?? []);
      setIsScanning(false);
      scanInFlightRef.current = false;

      const topCandidate = payload.data.candidates[0];
      const hasNoText = payload.data.issues.some((issue) => issue.code === "no_text_detected" || issue.code === "ocr_empty");
      const isLowConfidence = payload.data.issues.some((issue) => issue.code === "low_confidence_match");

      if (hasNoText) {
        setLoopState("no-text-detected");
      } else if (isLowConfidence) {
        setLoopState("low-confidence");
      } else if (topCandidate) {
        setLoopState("candidate-found");
      } else {
        setLoopState("no-text-detected");
      }

      if (topCandidate && topCandidate.confidence >= 0.86) {
        setPendingImports((current) =>
          addPendingImport(current, {
            card: topCandidate.card,
            confidence: topCandidate.confidence,
            addedAt: new Date().toISOString(),
            scanId: payload.data!.scanId,
          }),
        );
        setLoopState("added-to-pending");
      }

      setDebugState({
        lastOcrText: payload.data.extractedText,
        lastConfidence: payload.data.extractionConfidence,
        lastCandidate: topCandidate?.card.name ?? null,
        lastError: null,
        lastProcessingMs: Math.round(performance.now() - startedAt),
      });

      // Scroll to results on mobile
      if (window.innerWidth < 1280) {
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      const timedOut = message === "The operation was aborted." || (err as { name?: string } | undefined)?.name === "AbortError";
      setScanError(timedOut ? "Scanner timed out while reading the frame." : message);
      setIssues([{ code: timedOut ? "ocr_timeout" : "scan_error", message: timedOut ? "OCR timed out for this frame." : "Network error. Check your connection and try again." }]);
      setLoopState(timedOut ? "timeout" : "error");
      setDebugState((current) => ({
        ...current,
        lastError: timedOut ? "Frame processing timeout (10s)" : message,
        lastProcessingMs: Math.round(performance.now() - startedAt),
      }));
      setIsScanning(false);
      scanInFlightRef.current = false;
    }
  }, [manualText, selectedFile]);

  useEffect(() => {
    if (!selectedFile || isScanning) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void runScan(selectedFile);
    }, 120);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [selectedFile, isScanning, runScan]);

  useEffect(() => {
    if (!canRunManualSearch) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setManualSearchLoading(true);
      try {
        const params = new URLSearchParams({
          query: normalizedManualSearch,
          pool: "all",
          commanderOnly: "false",
          sort: "relevance",
          pageSize: "8",
        });
        const response = await fetch(`/api/cards?${params.toString()}`, { signal: controller.signal });
        const payload = await response.json();
        const parsed = parseCardSearchResultResponse(payload, "scanner_manual_fallback");
        if (!parsed || !response.ok) {
          setManualSearchResults([]);
          setManualSearchLoading(false);
          return;
        }

        setManualSearchResults(toCardSelectionItems(parsed.items));
        setManualSearchLoading(false);
      } catch (error) {
        if ((error as { name?: string } | undefined)?.name === "AbortError") {
          return;
        }
        setManualSearchResults([]);
        setManualSearchLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [canRunManualSearch, normalizedManualSearch]);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(280px,420px)_1fr]">
      {/* Left column: Capture & input */}
      <section className="space-y-5">
        {/* Camera capture zone with permission handling */}
        <ScannerCaptureZone
          onFileSelected={handleFileSelected}
          capabilities={capabilities}
          isDetecting={isDetecting}
          error={cameraError}
          onRequestPermission={requestPermission}
          onRefresh={refresh}
          isScanning={isScanning}
          onLiveCameraStatusChange={setCameraState}
        />

        {/* Preview of captured/uploaded image */}
        {previewUrl && (
          <div className="surface-panel overflow-hidden">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Scan preview"
                className="max-h-[28rem] w-full object-contain"
              />
              {/* File info overlay */}
              {compressionInfo && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                  <p className="text-xs text-zinc-300">
                    {selectedFile?.name}
                    {compressionInfo.wasCompressed && (
                      <span className="ml-2 text-emerald-400">
                        (optimized {Math.round((1 - compressionInfo.ratio) * 100)}%)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* OCR correction input */}
        {selectedFile && (
          <div className="surface-panel p-5 sm:p-6">
            <label className="block space-y-2">
              <span className="type-label">OCR Correction Hints</span>
              <textarea
                ref={manualInputRef}
                rows={3}
                value={manualText}
                onChange={(event) => setManualText(event.target.value)}
                placeholder="If the card name is hard to read, type clues here (e.g., partial name, set code)..."
                className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
              />
            </label>

            <div className="mt-4 flex gap-2">
              <p className="flex-1 rounded-xl border border-[color:var(--surface-border)] bg-white/[0.02] px-3 py-2 text-xs text-[color:var(--text-subtle)]">
                Auto scan is active. New frames and uploads are analyzed automatically.
              </p>
              <button type="button" className="nav-link" onClick={handleRetake}>
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Error panel with retry options */}
        {issues.length > 0 && !isScanning && (
          <ScannerErrorPanel
            issues={issues}
            onRetake={handleRetake}
            onAdjustAndRetry={handleAdjustAndRetry}
          />
        )}

        <div className="surface-panel p-4">
          <p className="type-label">Scanner Runtime</p>
          <p className="mt-2 text-xs text-[color:var(--text-subtle)]">Camera: {cameraState}</p>
          <p className="text-xs text-[color:var(--text-subtle)]">Loop: {loopState}</p>
          <p className="text-xs text-[color:var(--text-subtle)]">OCR text: {debugState.lastOcrText || "(none)"}</p>
          <p className="text-xs text-[color:var(--text-subtle)]">Confidence: {debugState.lastConfidence !== null ? formatPercentRatio(debugState.lastConfidence) : "(n/a)"}</p>
          <p className="text-xs text-[color:var(--text-subtle)]">Candidate: {debugState.lastCandidate ?? "(none)"}</p>
          <p className="text-xs text-[color:var(--text-subtle)]">Frame time: {debugState.lastProcessingMs !== null ? `${debugState.lastProcessingMs}ms` : "(n/a)"}</p>
          {debugState.lastError ? (
            <p className="mt-1 text-xs text-rose-300">Error: {debugState.lastError}</p>
          ) : null}
        </div>
      </section>

      {/* Right column: Results */}
      <section ref={resultsRef} className="space-y-5">
        {/* Progress indicator during scan */}
        {isScanning && (
          <ScannerProgress
            currentStage={scanStage}
            hasError={!!scanError}
            errorMessage={scanError ?? undefined}
          />
        )}

        {/* Pipeline stages (after scan) */}
        {!isScanning && scan && (
          <div className="surface-panel p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="type-label">Pipeline Stages</p>
              <p className="text-xs text-[color:var(--text-subtle)]">
                OCR Confidence {formatPercentRatio(scan.extractionConfidence)}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {scan.stages.map((stage) => (
                <span
                  key={stage.stage}
                  className={`rounded-full border px-3 py-1 text-xs ${statusClass(stage.status)}`}
                  title={stage.summary}
                >
                  {stageLabel[stage.stage]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Candidate results */}
        <div className="surface-panel p-5 sm:p-6">
          <p className="type-label">Candidate Matches</p>
          <p className="mt-2 text-sm text-[color:var(--text-subtle)]">
            {scan
              ? "Select a match to import to your library."
              : "Start live scan, snap, or upload an image to begin scanning."}
          </p>

          <div className="mt-4 space-y-3">
            {pendingImports.items.length > 0 ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-emerald-200">
                  Pending Import Queue
                </p>
                <div className="mt-2 space-y-2">
                  {pendingImports.items.slice(0, 4).map((pending) => (
                    <article key={`${pending.scanId}-${pending.card.id}`} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                      <CardPreviewThumbnail normalUri={pending.card.imageUri} name={pending.card.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-zinc-100">{pending.card.name}</p>
                        <p className="text-xs text-[color:var(--text-subtle)]">
                          Confidence {formatPercentRatio(pending.confidence)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="nav-link nav-link-active"
                        onClick={() =>
                          setConfirmingCandidate({
                            card: pending.card,
                            confidence: pending.confidence,
                            reasons: ["Auto-queued high-confidence recognition"],
                          })
                        }
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="nav-link"
                        onClick={() => setPendingImports((current) => removePendingImport(current, pending.card.id))}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
            {scan?.candidates.length ? (
              scan.candidates.map((candidate) => (
                <article
                  key={candidate.card.id}
                  className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.02] p-3"
                >
                  <div className="flex items-start gap-3">
                    <CardPreviewThumbnail
                      normalUri={candidate.card.imageUri}
                      name={candidate.card.name}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">{candidate.card.name}</p>
                      <p className="truncate text-xs text-[color:var(--text-subtle)]">
                        {candidate.card.typeLine}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-subtle)]">
                        <span>Confidence {formatPercentRatio(candidate.confidence)}</span>
                        <span>&middot;</span>
                        <span>{formatUsd(candidate.card.price?.usd ?? null)}</span>
                      </div>
                      {candidate.reasons.length > 0 && (
                        <p className="mt-2 text-xs text-[color:var(--text-subtle)]">
                          {candidate.reasons[0]}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingCandidate(candidate);
                          setLastImport(null);
                        }}
                        className="nav-link nav-link-active"
                      >
                        <Library size={14} className="mr-1.5" />
                        Import
                      </button>
                      <a href={`/cards/${candidate.card.id}?pool=all`} className="nav-link text-xs">
                        View
                      </a>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-[color:var(--surface-border)] bg-white/[0.02] p-4 text-sm text-[color:var(--text-subtle)]">
                {scan
                  ? "No matches found. Try a clearer image or add OCR hints."
                  : "Waiting for scan results..."}
              </div>
            )}
          </div>
        </div>

        {needsManualFallback ? (
          <div className="surface-panel p-5 sm:p-6">
            <p className="type-label">Manual Confirmation Fallback</p>
            <p className="mt-2 text-sm text-[color:var(--text-subtle)]">
              Confidence is low. Search and select the correct card before importing.
            </p>
            <label className="mt-3 block">
              <input
                value={manualSearch}
                onChange={(event) => setManualSearch(event.target.value)}
                placeholder="Search card name manually"
                className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
              />
            </label>
            <div className="mt-3 space-y-2">
              {showManualSearchLoading ? (
                <p className="text-xs text-[color:var(--text-subtle)]">Searching...</p>
              ) : visibleManualSearchResults.length === 0 ? (
                <p className="text-xs text-[color:var(--text-subtle)]">
                  {manualSearch.trim().length < 2 ? "Type at least 2 characters." : "No manual results yet."}
                </p>
              ) : (
                visibleManualSearchResults.map((item) => (
                  <article key={item.id} className="surface-card flex items-center gap-3 p-3">
                    <CardPreviewThumbnail normalUri={item.imageUri} name={item.title} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-zinc-100">{item.title}</p>
                      <p className="truncate text-xs text-[color:var(--text-subtle)]">{item.subtitle}</p>
                    </div>
                    <button
                      type="button"
                      className="nav-link nav-link-active"
                      onClick={() =>
                        setConfirmingCandidate({
                          card: {
                            id: item.id,
                            oracleId: item.selection.cardId,
                            name: item.title,
                            manaCost: item.manaCost,
                            typeLine: item.subtitle,
                            oracleText: null,
                            colorIdentity: [],
                            cmc: 0,
                            legalCommander: true,
                            imageUri: item.imageUri,
                            price: item.price ? { usd: item.price.usd } : null,
                          },
                          confidence: 0.35,
                          reasons: ["Manual search selection"],
                        })
                      }
                    >
                      Select
                    </button>
                  </article>
                ))
              )}
            </div>
          </div>
        ) : null}
      </section>

      {/* Confirmation Panel Overlay */}
      {confirmingCandidate && scan && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <ScannerConfirmationPanel
              scanId={scan.scanId}
              candidate={confirmingCandidate}
              onConfirmed={(result) => {
                setLastImport(result);
                setPendingImports((current) => removePendingImport(current, confirmingCandidate.card.id));
                setConfirmingCandidate(null);
                broadcastLibraryInvalidation("scanner_import_confirmed");
              }}
              onCancel={() => setConfirmingCandidate(null)}
            />
          </div>
        </div>
      )}

      {/* Success Toast */}
      {lastImport && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
          <div className="surface-panel flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
              <Check size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-100">
                Added {lastImport.quantity}x {lastImport.cardName}
              </p>
              <p className="text-xs text-[color:var(--text-subtle)]">
                {lastImport.setName} &middot; {lastImport.finish} &middot; {lastImport.condition}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLastImport(null)}
              className="ml-2 rounded-full p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

