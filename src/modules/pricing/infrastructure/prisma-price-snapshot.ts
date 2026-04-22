import type { PriceSnapshot } from "@/modules/pricing";

type PrismaPriceSnapshotLike = {
  source: string;
  capturedAt: Date;
  usd: { toNumber(): number } | number | null;
  usdFoil: { toNumber(): number } | number | null;
  usdEtched: { toNumber(): number } | number | null;
  eur: { toNumber(): number } | number | null;
  eurFoil: { toNumber(): number } | number | null;
  tix: { toNumber(): number } | number | null;
};

function toNumber(value: { toNumber(): number } | number | null): number | null {
  if (value === null) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  return value.toNumber();
}

export function toPriceSnapshot(snapshot: PrismaPriceSnapshotLike | null): PriceSnapshot | null {
  if (!snapshot) {
    return null;
  }

  return {
    source: snapshot.source.toLowerCase() === "scryfall" ? "scryfall" : "scryfall",
    capturedAt: snapshot.capturedAt.toISOString(),
    usd: toNumber(snapshot.usd),
    usdFoil: toNumber(snapshot.usdFoil),
    usdEtched: toNumber(snapshot.usdEtched),
    eur: toNumber(snapshot.eur),
    eurFoil: toNumber(snapshot.eurFoil),
    tix: toNumber(snapshot.tix),
  };
}

