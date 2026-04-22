"use client";

import { useMemo, useState } from "react";
import { Check, Library } from "lucide-react";
import type { ScannerConfirmationResult } from "@/modules/scanner";
import { formatPercentRatio, formatUsd } from "@/modules/pricing";
import { ScannerConfirmationPanel } from "@/components/scanner/scanner-confirmation-panel";

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

type ScannerIssue = {
  code: string;
  message: string;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState("");
  const [scan, setScan] = useState<ScannerResponse | null>(null);
  const [issues, setIssues] = useState<ScannerIssue[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Confirmation flow state
  const [confirmingCandidate, setConfirmingCandidate] = useState<ScannerCandidate | null>(null);
  const [lastImport, setLastImport] = useState<ScannerConfirmationResult | null>(null);

  const previewUrl = useMemo(() => (selectedFile ? URL.createObjectURL(selectedFile) : null), [selectedFile]);

  async function runScan() {
    if (!selectedFile) {
      setIssues([{ code: "image_missing", message: "Capture or upload an image first." }]);
      return;
    }

    setIsScanning(true);
    setIssues([]);

    const form = new FormData();
    form.set("image", selectedFile);
    if (manualText.trim()) {
      form.set("manualText", manualText.trim());
    }

    const response = await fetch("/api/scanner/scan", {
      method: "POST",
      body: form,
    });

    const payload = (await response.json()) as { data?: ScannerResponse & { issues?: ScannerIssue[] }; error?: string };

    if (!response.ok) {
      setScan(null);
      setIssues(payload.data?.issues ?? [{ code: "scan_error", message: payload.error ?? "Scan failed." }]);
      setIsScanning(false);
      return;
    }

    if (!payload.data) {
      setScan(null);
      setIssues([{ code: "scan_error", message: "No scan data returned." }]);
      setIsScanning(false);
      return;
    }

    setScan(payload.data);
    setIssues(payload.data.issues ?? []);
    setIsScanning(false);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(280px,420px)_1fr]">
      <section className="space-y-5">
        <div className="surface-panel p-5 sm:p-6">
          <p className="type-label">Image Capture</p>
          <label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-[color:var(--surface-border-strong)] bg-white/[0.02] p-4 text-sm text-zinc-300">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
            Tap to capture or upload a card image
          </label>

          {previewUrl ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-[color:var(--surface-border)] bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Scan preview" className="max-h-[28rem] w-full object-contain" />
            </div>
          ) : null}

          <label className="mt-4 block space-y-2">
            <span className="type-label">OCR Correction Text (Optional)</span>
            <textarea
              rows={4}
              value={manualText}
              onChange={(event) => setManualText(event.target.value)}
              placeholder="If OCR is uncertain, add card-name clues here."
              className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
            />
          </label>

          <div className="mt-4 flex gap-2">
            <button type="button" className="nav-link nav-link-active" onClick={runScan} disabled={isScanning}>
              {isScanning ? "Scanning..." : "Run Scan Pipeline"}
            </button>
            <button
              type="button"
              className="nav-link"
              onClick={() => {
                setSelectedFile(null);
                setManualText("");
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {issues.length > 0 ? (
          <div className="surface-panel p-4">
            <p className="type-label">Uncertainty</p>
            <div className="mt-2 space-y-2">
              {issues.map((issue, index) => (
                <p key={`${issue.code}-${index}`} className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  {issue.message}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-5">
        <div className="surface-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="type-label">Pipeline Stages</p>
            {scan ? (
              <p className="text-xs text-[color:var(--text-subtle)]">
                OCR Confidence {formatPercentRatio(scan.extractionConfidence)}
              </p>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(scan?.stages ?? []).map((stage) => (
              <span
                key={stage.stage}
                className={`rounded-full border px-3 py-1 text-xs ${statusClass(stage.status)}`}
                title={stage.summary}
              >
                {stageLabel[stage.stage]}
              </span>
            ))}
            {!scan ? <span className="text-xs text-[color:var(--text-subtle)]">Run a scan to view stage results.</span> : null}
          </div>
        </div>

        <div className="surface-panel p-5 sm:p-6">
          <p className="type-label">Candidate Confirmation</p>
          <p className="mt-2 text-sm text-[color:var(--text-subtle)]">
            Confirm the best match before using downstream actions like collection import or deck inspection.
          </p>

          <div className="mt-4 space-y-3">
            {scan?.candidates.length ? (
              scan.candidates.map((candidate) => (
                <article key={candidate.card.id} className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.02] p-3">
                  <div className="flex items-start gap-3">
                    <div className="h-20 w-14 overflow-hidden rounded border border-white/10 bg-zinc-900">
                      {candidate.card.imageUri ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={candidate.card.imageUri} alt={candidate.card.name} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">{candidate.card.name}</p>
                      <p className="truncate text-xs text-[color:var(--text-subtle)]">{candidate.card.typeLine}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-subtle)]">
                        <span>Confidence {formatPercentRatio(candidate.confidence)}</span>
                        <span>•</span>
                        <span>{formatUsd(candidate.card.price?.usd ?? null)}</span>
                      </div>
                      {candidate.reasons.length > 0 ? (
                        <p className="mt-2 text-xs text-[color:var(--text-subtle)]">{candidate.reasons[0]}</p>
                      ) : null}
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
                No ranked candidates yet. Capture a clearer image or provide OCR correction text.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Confirmation Panel Overlay */}
      {confirmingCandidate && scan ? (
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
      ) : null}

      {/* Success Toast */}
      {lastImport ? (
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
      ) : null}
    </div>
  );
}

