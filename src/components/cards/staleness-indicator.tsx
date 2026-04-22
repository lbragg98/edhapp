import { AlertCircle } from "lucide-react";

type StalenessIndicatorProps = {
  rulingsStale: boolean;
  pricesStale: number;
  totalPrintings: number;
};

/**
 * Displays subtle indicators when pricing or rulings data is stale.
 * Shown on card detail pages to indicate background refresh is queued.
 */
export function StalenessIndicator({
  rulingsStale,
  pricesStale,
  totalPrintings,
}: StalenessIndicatorProps) {
  const showRulingsBadge = rulingsStale;
  const showPricesBadge = pricesStale > 0;

  if (!showRulingsBadge && !showPricesBadge) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {showRulingsBadge && (
        <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs">
          <AlertCircle size={12} className="text-amber-400" />
          <span className="text-amber-200">Rulings refreshing</span>
        </div>
      )}
      {showPricesBadge && (
        <div className="flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs">
          <AlertCircle size={12} className="text-cyan-400" />
          <span className="text-cyan-200">
            {pricesStale === totalPrintings
              ? "Prices refreshing"
              : `${pricesStale}/${totalPrintings} prices refreshing`}
          </span>
        </div>
      )}
    </div>
  );
}
