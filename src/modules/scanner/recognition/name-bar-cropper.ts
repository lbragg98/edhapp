import type { PixelRegion } from "@/modules/scanner/recognition/card-region-cropper";

export function computeNameBarRegion(
  cardRegion: PixelRegion,
  options?: {
    nameBarHeightRatio?: number;
  },
): PixelRegion {
  const heightRatio = Math.max(0.1, Math.min(options?.nameBarHeightRatio ?? 0.2, 0.35));
  const height = Math.max(16, Math.floor(cardRegion.height * heightRatio));

  return {
    left: cardRegion.left,
    top: cardRegion.top,
    width: cardRegion.width,
    height,
  };
}

