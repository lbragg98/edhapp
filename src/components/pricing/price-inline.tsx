import { formatUsd, selectUsdPrice } from "@/modules/pricing";
import type { PriceFinish, PriceSnapshot } from "@/modules/pricing";

type PriceInlineProps = {
  price: PriceSnapshot | null;
  finish?: PriceFinish;
  className?: string;
};

export function PriceInline({ price, finish = "NONFOIL", className }: PriceInlineProps) {
  const value = selectUsdPrice(price, finish);

  return <span className={className ?? "text-xs text-[color:var(--text-subtle)]"}>{formatUsd(value)}</span>;
}

