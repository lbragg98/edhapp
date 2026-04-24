export const POINTS_PER_INCH = 72;
export const MM_PER_INCH = 25.4;

export const US_LEGAL_PAGE = {
  widthInches: 8.5,
  heightInches: 14,
} as const;

export const CARD_SIZE = {
  widthMm: 63,
  heightMm: 88,
} as const;

export const GRID = {
  columns: 3,
  rows: 3,
} as const;

export const GUIDE = {
  strokeWidthPoints: 0.5,
  colorGray: 0.72,
  colorOpacity: 0.6,
  crosshairExtensionPoints: 5,
} as const;

export function toPoints(inches: number): number {
  return inches * POINTS_PER_INCH;
}

export function mmToPoints(mm: number): number {
  return (mm / MM_PER_INCH) * POINTS_PER_INCH;
}

export const pageLayoutPoints = {
  pageWidth: toPoints(US_LEGAL_PAGE.widthInches),
  pageHeight: toPoints(US_LEGAL_PAGE.heightInches),
  cardWidth: mmToPoints(CARD_SIZE.widthMm),
  cardHeight: mmToPoints(CARD_SIZE.heightMm),
};

export const gridLayoutPoints = {
  width: pageLayoutPoints.cardWidth * GRID.columns,
  height: pageLayoutPoints.cardHeight * GRID.rows,
  cardsPerPage: GRID.columns * GRID.rows,
};

export const centeredGridOrigin = {
  x: (pageLayoutPoints.pageWidth - gridLayoutPoints.width) / 2,
  y: (pageLayoutPoints.pageHeight - gridLayoutPoints.height) / 2,
};

export const calibrationLayout = {
  referenceLineInches: 1,
  referenceLinePoints: toPoints(1),
  cardOutlineWidth: pageLayoutPoints.cardWidth,
  cardOutlineHeight: pageLayoutPoints.cardHeight,
};
