export function formatUsd(value: number | null | undefined, fallback = "N/A"): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercentRatio(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function parseExternalPrice(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
}

