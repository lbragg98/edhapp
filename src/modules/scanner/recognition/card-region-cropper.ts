export type PixelRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeCardGuideRegion(
  frameWidth: number,
  frameHeight: number,
  options?: {
    guideWidthRatio?: number;
    guideHeightRatio?: number;
  },
): PixelRegion {
  const guideWidthRatio = clamp(options?.guideWidthRatio ?? 0.65, 0.3, 1);
  const guideHeightRatio = clamp(options?.guideHeightRatio ?? 0.85, 0.3, 1);

  const width = Math.max(16, Math.floor(frameWidth * guideWidthRatio));
  const height = Math.max(16, Math.floor(frameHeight * guideHeightRatio));
  const left = Math.floor((frameWidth - width) / 2);
  const top = Math.floor((frameHeight - height) / 2);

  return { left, top, width, height };
}

