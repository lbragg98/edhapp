import { formatPercentRatio, formatUsd } from "@/modules/pricing";
import type { ValuationEstimate } from "@/modules/pricing";

type ValueEstimateChipProps = {
  label: string;
  estimate: ValuationEstimate;
};

export function ValueEstimateChip({ label, estimate }: ValueEstimateChipProps) {
  return (
    <div className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.02] px-3 py-2">
      <p className="type-label">{label}</p>
      <p className="mt-1 text-sm font-medium text-zinc-100">{formatUsd(estimate.totalUsd)}</p>
      <p className="mt-0.5 text-xs text-[color:var(--text-subtle)]">
        Coverage {formatPercentRatio(estimate.coverageRatio)}
        {estimate.missingQuantity > 0 ? ` • ${estimate.missingQuantity} unpriced` : ""}
      </p>
    </div>
  );
}

