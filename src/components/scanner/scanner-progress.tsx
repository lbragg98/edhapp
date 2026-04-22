"use client";

import { Check, Loader2, AlertCircle } from "lucide-react";

type ScanStage = "upload" | "preprocessing" | "ocr" | "matching" | "complete";

type StageConfig = {
  label: string;
  description: string;
};

const STAGE_CONFIG: Record<ScanStage, StageConfig> = {
  upload: {
    label: "Uploading",
    description: "Sending image to server...",
  },
  preprocessing: {
    label: "Processing",
    description: "Preparing image for OCR...",
  },
  ocr: {
    label: "Reading",
    description: "Extracting card text...",
  },
  matching: {
    label: "Matching",
    description: "Finding card matches...",
  },
  complete: {
    label: "Complete",
    description: "Scan finished",
  },
};

const STAGES_ORDER: ScanStage[] = ["upload", "preprocessing", "ocr", "matching", "complete"];

type ScannerProgressProps = {
  /** Current stage */
  currentStage: ScanStage;
  /** Whether there was an error */
  hasError?: boolean;
  /** Error message to display */
  errorMessage?: string;
};

function getStageIndex(stage: ScanStage): number {
  return STAGES_ORDER.indexOf(stage);
}

/**
 * Animated progress indicator showing scan pipeline stages.
 */
export function ScannerProgress({
  currentStage,
  hasError = false,
  errorMessage,
}: ScannerProgressProps) {
  const currentIndex = getStageIndex(currentStage);
  const config = STAGE_CONFIG[currentStage];

  return (
    <div className="surface-panel p-5 sm:p-6">
      {/* Stage indicators */}
      <div className="flex items-center justify-between">
        {STAGES_ORDER.slice(0, -1).map((stage, index) => {
          const isComplete = index < currentIndex || currentStage === "complete";
          const isCurrent = index === currentIndex && currentStage !== "complete";
          const isPending = index > currentIndex;
          const isError = hasError && isCurrent;

          return (
            <div key={stage} className="flex items-center">
              {/* Stage dot */}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${
                  isError
                    ? "bg-rose-500/20 text-rose-400"
                    : isComplete
                      ? "bg-emerald-500/20 text-emerald-400"
                      : isCurrent
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-zinc-700/30 text-zinc-500"
                }`}
              >
                {isError ? (
                  <AlertCircle size={16} />
                ) : isComplete ? (
                  <Check size={16} />
                ) : isCurrent ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>

              {/* Connector line */}
              {index < STAGES_ORDER.length - 2 && (
                <div
                  className={`mx-2 h-0.5 w-8 rounded-full transition-all duration-500 sm:w-12 ${
                    isComplete ? "bg-emerald-500/40" : "bg-zinc-700/30"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current stage info */}
      <div className="mt-4 text-center">
        <p
          className={`text-sm font-medium ${
            hasError ? "text-rose-300" : currentStage === "complete" ? "text-emerald-300" : "text-zinc-100"
          }`}
        >
          {hasError ? "Scan Failed" : config.label}
        </p>
        <p className="mt-1 text-xs text-[color:var(--text-subtle)]">
          {hasError ? errorMessage || "An error occurred during scanning" : config.description}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            hasError
              ? "bg-rose-500"
              : currentStage === "complete"
                ? "bg-emerald-500"
                : "bg-blue-500"
          }`}
          style={{
            width: hasError
              ? `${((currentIndex + 0.5) / (STAGES_ORDER.length - 1)) * 100}%`
              : `${((currentIndex + 0.5) / (STAGES_ORDER.length - 1)) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Hook to manage scan progress state.
 */
export function useScanProgress() {
  // This would be used by the workspace to control progress display
  // For now, exported for future integration
  return {
    stages: STAGES_ORDER,
    config: STAGE_CONFIG,
  };
}
