import type { ScannerRegion } from "@/modules/scanner/domain/scanner-record";

const NAME_REGION = {
  x: 0.05,
  y: 0.04,
  width: 0.9,
  height: 0.12,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function buildCardNameRegion(regionId = "name_bar"): ScannerRegion {
  return {
    id: regionId,
    x: clamp(NAME_REGION.x, 0, 1),
    y: clamp(NAME_REGION.y, 0, 1),
    width: clamp(NAME_REGION.width, 0.05, 1),
    height: clamp(NAME_REGION.height, 0.05, 1),
    confidence: 0.9,
  };
}

export function buildFallbackNameRegions(): ScannerRegion[] {
  return [
    buildCardNameRegion("name_bar_primary"),
  ];
}
