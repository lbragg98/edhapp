"use client";

import { AlertTriangle, Camera, RefreshCw, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { ScannerIssue } from "@/modules/scanner";

type ErrorSeverity = "warning" | "error" | "info";

type ScannerErrorPanelProps = {
  issues: ScannerIssue[];
  onRetake: () => void;
  onAdjustAndRetry: () => void;
  /** Whether to show retry actions */
  showActions?: boolean;
};

/**
 * Maps issue codes to severity levels and recovery suggestions.
 */
function getIssueSeverity(code: string): ErrorSeverity {
  switch (code) {
    case "image_missing":
    case "image_invalid":
      return "error";
    case "ocr_unavailable":
    case "ocr_empty":
      return "error";
    case "low_confidence_match":
      return "warning";
    default:
      return "info";
  }
}

function getSuggestion(code: string): string | null {
  switch (code) {
    case "image_missing":
      return "Capture or upload an image to scan.";
    case "image_invalid":
      return "Try a different image format (JPEG, PNG).";
    case "ocr_unavailable":
      return "OCR service is temporarily unavailable. Try again in a moment.";
    case "ocr_empty":
      return "No text was detected. Ensure the card name is clearly visible and well-lit.";
    case "low_confidence_match":
      return "Add OCR correction text below to help identify the card.";
    default:
      return null;
  }
}

function severityStyles(severity: ErrorSeverity): { bg: string; border: string; text: string; icon: string } {
  switch (severity) {
    case "error":
      return {
        bg: "bg-rose-500/10",
        border: "border-rose-500/25",
        text: "text-rose-100",
        icon: "text-rose-400",
      };
    case "warning":
      return {
        bg: "bg-amber-500/10",
        border: "border-amber-500/25",
        text: "text-amber-100",
        icon: "text-amber-400",
      };
    case "info":
    default:
      return {
        bg: "bg-zinc-500/10",
        border: "border-zinc-500/25",
        text: "text-zinc-200",
        icon: "text-zinc-400",
      };
  }
}

/**
 * Enhanced error panel with severity levels, suggestions, and retry actions.
 */
export function ScannerErrorPanel({
  issues,
  onRetake,
  onAdjustAndRetry,
  showActions = true,
}: ScannerErrorPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (issues.length === 0) return null;

  // Group by severity
  const errors = issues.filter((i) => getIssueSeverity(i.code) === "error");
  const warnings = issues.filter((i) => getIssueSeverity(i.code) === "warning");
  const infos = issues.filter((i) => getIssueSeverity(i.code) === "info");

  const hasErrors = errors.length > 0;
  const primaryIssue = errors[0] || warnings[0] || infos[0];
  const primarySeverity = getIssueSeverity(primaryIssue.code);
  const primaryStyles = severityStyles(primarySeverity);
  const primarySuggestion = getSuggestion(primaryIssue.code);

  const additionalIssues = issues.slice(1);

  return (
    <div className="surface-panel overflow-hidden">
      {/* Primary issue */}
      <div className={`${primaryStyles.bg} p-4`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${primaryStyles.icon}`}>
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${primaryStyles.text}`}>{primaryIssue.message}</p>
            {primarySuggestion && (
              <p className="mt-1 text-xs text-[color:var(--text-subtle)]">{primarySuggestion}</p>
            )}
          </div>
          {additionalIssues.length > 0 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0 rounded-full p-1 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>

        {/* Additional issues */}
        {isExpanded && additionalIssues.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
            {additionalIssues.map((issue, index) => {
              const severity = getIssueSeverity(issue.code);
              const styles = severityStyles(severity);
              const suggestion = getSuggestion(issue.code);
              return (
                <div key={`${issue.code}-${index}`} className="flex items-start gap-2">
                  <div className={`mt-0.5 ${styles.icon}`}>
                    <HelpCircle size={14} />
                  </div>
                  <div>
                    <p className={`text-xs ${styles.text}`}>{issue.message}</p>
                    {suggestion && (
                      <p className="mt-0.5 text-xs text-zinc-500">{suggestion}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recovery actions */}
      {showActions && (
        <div className="flex flex-wrap gap-2 border-t border-[color:var(--surface-border)] bg-white/[0.02] px-4 py-3">
          {hasErrors ? (
            <button type="button" onClick={onRetake} className="nav-link nav-link-active">
              <Camera size={14} className="mr-1.5" />
              Retake Photo
            </button>
          ) : (
            <>
              <button type="button" onClick={onAdjustAndRetry} className="nav-link nav-link-active">
                <RefreshCw size={14} className="mr-1.5" />
                Retry with Hints
              </button>
              <button type="button" onClick={onRetake} className="nav-link">
                <Camera size={14} className="mr-1.5" />
                Retake
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
