"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Check, Library } from "lucide-react";
import type { ScannerConfirmationResult, ScannerIssue } from "@/modules/scanner";
import { useCameraPermissions } from "@/modules/scanner/presentation/use-camera-permissions";
import type { CompressionResult } from "@/modules/scanner/application/compress-image";
import { formatPercentRatio, formatUsd } from "@/modules/pricing";
import { ScannerConfirmationPanel } from "@/components/scanner/scanner-confirmation-panel";
import { ScannerCaptureZone } from "@/components/scanner/scanner-capture-zone";
import { ScannerErrorPanel } from "@/components/scanner/scanner-error-panel";
import { ScannerProgress } from "@/components/scanner/scanner-progress";
import { CardPreviewThumbnail } from "@/components/cards/card-preview";

type ScanStage = "upload" | "preprocessing" | "ocr" | "matching" | "complete";

type ScannerCandidate = {
  card: {
    id: string;
    name: string;
    manaCost: string | null;
    typeLine: string;
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

  // Refs for scroll behavior
  const resultsRef = useRef<HTMLElement>(null);
  const manualInputRef = useRef<HTMLTextAreaElement>(null);

  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile]
  );

  const handleFileSelected = useCallback((file: File, compression: CompressionResult) => {
    setSelectedFile(file);
    setCompressionInfo(compression);
    // Clear previous scan results when new file is selected
    setScan(null);
    setIssues([]);
    setScanError(null);
  }, []);

  const handleRetake = useCallback(() => {
    setSelectedFile(null);
    setCompressionInfo(null);
    setScan(null);
    setIssues([]);
    setScanError(null);
    setManualText("");
  }, []);

  const handleAdjustAndRetry = useCallback(() => {
    // Focus on manual text input for OCR hints
    manualInputRef.current?.focus();
    manualInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  async function runScan() {
    if (!selectedFile) {
      setIssues([{ code: "image_missing", message: "Capture or upload an image first." }]);
      return;
    }

    setIsScanning(true);
    setIssues([]);
    setScanError(null);
    setScanStage("upload");

    const form = new FormData();
    form.set("image", selectedFile);
    if (manualText.trim()) {
      form.set("manualText", manualText.trim());
    }

    try {
      // Simulate stage progression (in reality, server would stream these)
      setScanStage("preprocessing");
      await new Promise((r) => setTimeout(r, 300));

      setScanStage("ocr");
      const response = await fetch("/api/scanner/scan", {
        method: "POST",
        body: form,
      });

      setScanStage("matching");

      const payload = (await response.json()) as {
        data?: ScannerResponse & { issues?: ScannerIssue[] };
        error?: string;
      };

      if (!response.ok) {
        setScan(null);
        setScanError(payload.error ?? "Scan failed.");
        setIssues(payload.data?.issues ?? [{ code: "scan_error", message: payload.error ?? "Scan failed." }]);
        setIsScanning(false);
        return;
      }

      if (!payload.data) {
        setScan(null);
        setScanError("No scan data returned.");
        setIssues([{ code: "scan_error", message: "No scan data returned." }]);
        setIsScanning(false);
        return;
      }

      setScanStage("complete");
      setScan(payload.data);
      setIssues(payload.data.issues ?? []);
      setIsScanning(false);

      // Scroll to results on mobile
      if (window.innerWidth < 1280) {
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Network error");
      setIssues([{ code: "scan_error", message: "Network error. Check your connection and try again." }]);
      setIsScanning(false);
    }
  }

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
              <button
                type="button"
                className="nav-link nav-link-active flex-1 justify-center"
                onClick={runScan}
                disabled={isScanning}
              >
                {isScanning ? "Scanning..." : "Run Scan Pipeline"}
              </button>
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
              : "Capture a card image and run the scan pipeline to see matches."}
          </p>

          <div className="mt-4 space-y-3">
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
                setConfirmingCandidate(null);
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
