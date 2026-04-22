"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, Minus, Plus, X } from "lucide-react";
import type { ScannerPrintingOption, ScannerConfirmationResult } from "@/modules/scanner";
import { formatUsd } from "@/modules/pricing";
import { CardPreviewThumbnail } from "@/components/cards/card-preview";

type ScannerCandidate = {
  card: {
    id: string;
    name: string;
    manaCost: string | null;
    typeLine: string;
    imageUri: string | null;
    price: { usd: number | null } | null;
  };
  confidence: number;
  reasons: string[];
};

type ScannerConfirmationPanelProps = {
  scanId: string;
  candidate: ScannerCandidate;
  onConfirmed: (result: ScannerConfirmationResult) => void;
  onCancel: () => void;
};

const FINISHES = ["NONFOIL", "FOIL", "ETCHED"] as const;
const CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"] as const;

const FINISH_LABELS: Record<string, string> = {
  NONFOIL: "Non-Foil",
  FOIL: "Foil",
  ETCHED: "Etched",
};

const CONDITION_LABELS: Record<string, string> = {
  NM: "Near Mint",
  LP: "Lightly Played",
  MP: "Moderately Played",
  HP: "Heavily Played",
  DMG: "Damaged",
};

export function ScannerConfirmationPanel({
  scanId,
  candidate,
  onConfirmed,
  onCancel,
}: ScannerConfirmationPanelProps) {
  const [printings, setPrintings] = useState<ScannerPrintingOption[]>([]);
  const [loadingPrintings, setLoadingPrintings] = useState(true);
  const [printingsError, setPrintingsError] = useState<string | null>(null);

  const [selectedPrinting, setSelectedPrinting] = useState<ScannerPrintingOption | null>(null);
  const [showPrintingPicker, setShowPrintingPicker] = useState(false);
  const [finish, setFinish] = useState<(typeof FINISHES)[number]>("NONFOIL");
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]>("NM");
  const [quantity, setQuantity] = useState(1);

  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const selectPrinting = useCallback((printing: ScannerPrintingOption) => {
    setSelectedPrinting(printing);
    setFinish((current) => {
      const normalizedFinishes = printing.finishes.map((value) => value.toUpperCase());
      if (normalizedFinishes.includes(current)) {
        return current;
      }

      const firstAvailable = normalizedFinishes.find((value) =>
        FINISHES.includes(value as (typeof FINISHES)[number]),
      );

      return firstAvailable ? (firstAvailable as (typeof FINISHES)[number]) : "NONFOIL";
    });
  }, []);

  // Fetch printings on mount
  useEffect(() => {
    async function fetchPrintings() {
      setLoadingPrintings(true);
      setPrintingsError(null);

      try {
        const response = await fetch(`/api/scanner/printings/${candidate.card.id}`);
        const payload = (await response.json()) as { data?: { printings: ScannerPrintingOption[] }; error?: string };

        if (!response.ok || !payload.data) {
          setPrintingsError(payload.error ?? "Failed to load printings.");
          return;
        }

        setPrintings(payload.data.printings);
        const [firstPrinting] = payload.data.printings;
        if (firstPrinting) {
          selectPrinting(firstPrinting);
        }
      } catch {
        setPrintingsError("Network error fetching printings.");
      } finally {
        setLoadingPrintings(false);
      }
    }

    fetchPrintings();
  }, [candidate.card.id, selectPrinting]);

  const availableFinishes = useMemo(
    () =>
      selectedPrinting
        ? FINISHES.filter((f) => selectedPrinting.finishes.map((sf) => sf.toUpperCase()).includes(f))
        : FINISHES,
    [selectedPrinting],
  );

  const handleConfirm = useCallback(async () => {
    if (!selectedPrinting) return;

    setIsConfirming(true);
    setConfirmError(null);

    try {
      const response = await fetch("/api/scanner/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId,
          cardId: candidate.card.id,
          printingId: selectedPrinting.scryfallId,
          finish,
          condition,
          quantity,
          cardName: candidate.card.name,
          setName: selectedPrinting.setName,
        }),
      });

      const payload = (await response.json()) as { data?: ScannerConfirmationResult; error?: string };

      if (!response.ok || !payload.data) {
        setConfirmError(payload.error ?? "Failed to import card.");
        return;
      }

      onConfirmed(payload.data);
    } catch {
      setConfirmError("Network error during import.");
    } finally {
      setIsConfirming(false);
    }
  }, [scanId, candidate, selectedPrinting, finish, condition, quantity, onConfirmed]);

  return (
    <div className="surface-panel overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[color:var(--surface-border)] px-4 py-3 sm:px-5">
        <p className="type-label">Confirm &amp; Import</p>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
          aria-label="Cancel"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-4 sm:p-5">
        {/* Card Preview */}
        <div className="flex items-start gap-3">
          <CardPreviewThumbnail
            normalUri={selectedPrinting?.imageUri ?? candidate.card.imageUri}
            name={candidate.card.name}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-100">{candidate.card.name}</p>
            <p className="truncate text-xs text-[color:var(--text-subtle)]">{candidate.card.typeLine}</p>
            {selectedPrinting ? (
              <p className="mt-1 text-xs text-[color:var(--text-subtle)]">
                {selectedPrinting.setName} ({selectedPrinting.setCode}) #{selectedPrinting.collectorNumber}
              </p>
            ) : null}
          </div>
        </div>

        {/* Printing Selector */}
        <div className="mt-5">
          <p className="type-label mb-2">Printing / Edition</p>
          {loadingPrintings ? (
            <div className="flex items-center gap-2 rounded-xl border border-[color:var(--surface-border)] bg-white/[0.02] px-4 py-3 text-sm text-zinc-400">
              <Loader2 size={16} className="animate-spin" />
              Loading printings...
            </div>
          ) : printingsError ? (
            <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {printingsError}
            </p>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPrintingPicker(!showPrintingPicker)}
                className="flex w-full items-center justify-between rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-4 py-3 text-left text-sm text-zinc-100 transition-colors hover:border-[color:var(--surface-border-strong)]"
              >
                <span className="truncate">
                  {selectedPrinting
                    ? `${selectedPrinting.setName} (${selectedPrinting.setCode}) #${selectedPrinting.collectorNumber}`
                    : "Select printing"}
                </span>
                <ChevronDown size={16} className={`shrink-0 text-zinc-400 transition-transform ${showPrintingPicker ? "rotate-180" : ""}`} />
              </button>

              {showPrintingPicker ? (
                <div className="absolute left-0 top-full z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[color:var(--surface-border)] bg-zinc-900 shadow-xl">
                  {printings.map((printing) => (
                    <button
                      key={printing.scryfallId}
                      type="button"
                      onClick={() => {
                        selectPrinting(printing);
                        setShowPrintingPicker(false);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5 ${
                        selectedPrinting?.scryfallId === printing.scryfallId ? "bg-white/5" : ""
                      }`}
                    >
                      <CardPreviewThumbnail
                        normalUri={printing.imageUri}
                        name={printing.setName}
                        className="h-10 w-7"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-zinc-100">
                          {printing.setName} ({printing.setCode})
                        </p>
                        <p className="truncate text-xs text-[color:var(--text-subtle)]">
                          #{printing.collectorNumber} &middot; {printing.rarity} &middot;{" "}
                          {printing.price?.usd ? formatUsd(parseFloat(printing.price.usd)) : "N/A"}
                        </p>
                      </div>
                      {selectedPrinting?.scryfallId === printing.scryfallId ? (
                        <Check size={14} className="shrink-0 text-emerald-400" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Finish & Condition Row */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="type-label mb-2">Finish</p>
            <div className="flex gap-1.5">
              {availableFinishes.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFinish(f)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs transition-colors ${
                    finish === f
                      ? "border-[color:var(--surface-border-strong)] bg-white/5 text-zinc-100"
                      : "border-[color:var(--surface-border)] bg-white/[0.02] text-zinc-400 hover:border-[color:var(--surface-border-strong)] hover:text-zinc-200"
                  }`}
                >
                  {FINISH_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="type-label mb-2">Condition</p>
            <div className="flex gap-1">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondition(c)}
                  className={`flex-1 rounded-lg border px-1.5 py-2 text-xs transition-colors ${
                    condition === c
                      ? "border-[color:var(--surface-border-strong)] bg-white/5 text-zinc-100"
                      : "border-[color:var(--surface-border)] bg-white/[0.02] text-zinc-400 hover:border-[color:var(--surface-border-strong)] hover:text-zinc-200"
                  }`}
                  title={CONDITION_LABELS[c]}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quantity */}
        <div className="mt-5">
          <p className="type-label mb-2">Quantity</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--surface-border)] bg-white/[0.02] text-zinc-400 transition-colors hover:border-[color:var(--surface-border-strong)] hover:text-zinc-200 disabled:opacity-40"
            >
              <Minus size={16} />
            </button>
            <input
              type="number"
              min={1}
              max={250}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(250, parseInt(e.target.value) || 1)))}
              className="h-10 w-20 rounded-lg border border-[color:var(--surface-border)] bg-white/[0.03] text-center text-sm text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setQuantity(Math.min(250, quantity + 1))}
              disabled={quantity >= 250}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--surface-border)] bg-white/[0.02] text-zinc-400 transition-colors hover:border-[color:var(--surface-border-strong)] hover:text-zinc-200 disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Error */}
        {confirmError ? (
          <p className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {confirmError}
          </p>
        ) : null}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedPrinting || isConfirming}
            className="nav-link nav-link-active flex-1 justify-center disabled:opacity-50"
          >
            {isConfirming ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${quantity} to Library`
            )}
          </button>
          <button type="button" onClick={onCancel} className="nav-link">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
