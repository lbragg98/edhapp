import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";
import {
  calibrationLayout,
  GRID,
  gridLayoutPoints,
  GUIDE,
  pageLayoutPoints,
} from "@/modules/playtest-pdf/domain/print-layout";
import type { ResolvedPrintableImage } from "@/modules/playtest-pdf/application/resolve-printable-images";

function chunk<T>(values: T[], size: number): T[][] {
  const output: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size));
  }

  return output;
}

async function embedCardImage(pdf: PDFDocument, image: ResolvedPrintableImage): Promise<PDFImage | null> {
  if (!image.bytes || !image.mimeType) {
    return null;
  }

  if (image.mimeType === "image/png") {
    return pdf.embedPng(image.bytes);
  }

  return pdf.embedJpg(image.bytes);
}

function drawCutGuides(
  page: ReturnType<PDFDocument["addPage"]>,
  grid: { columns: number; rows: number },
  origin: { x: number; y: number },
) {
  const xStart = origin.x;
  const yStart = origin.y;
  const xEnd = xStart + grid.columns * pageLayoutPoints.cardWidth;
  const yEnd = yStart + grid.rows * pageLayoutPoints.cardHeight;

  for (let column = 0; column <= grid.columns; column += 1) {
    const x = xStart + column * pageLayoutPoints.cardWidth;

    page.drawLine({
      start: { x, y: yStart - GUIDE.crosshairExtensionPoints },
      end: { x, y: yEnd + GUIDE.crosshairExtensionPoints },
      thickness: GUIDE.strokeWidthPoints,
      color: rgb(GUIDE.colorGray, GUIDE.colorGray, GUIDE.colorGray),
      opacity: GUIDE.colorOpacity,
    });
  }

  for (let row = 0; row <= grid.rows; row += 1) {
    const y = yStart + row * pageLayoutPoints.cardHeight;

    page.drawLine({
      start: { x: xStart - GUIDE.crosshairExtensionPoints, y },
      end: { x: xEnd + GUIDE.crosshairExtensionPoints, y },
      thickness: GUIDE.strokeWidthPoints,
      color: rgb(GUIDE.colorGray, GUIDE.colorGray, GUIDE.colorGray),
      opacity: GUIDE.colorOpacity,
    });
  }
}

function selectGridCapacity() {
  const canFitThreeByThree =
    gridLayoutPoints.width + GUIDE.crosshairExtensionPoints * 2 <= pageLayoutPoints.pageWidth &&
    gridLayoutPoints.height + GUIDE.crosshairExtensionPoints * 2 <= pageLayoutPoints.pageHeight;

  if (canFitThreeByThree) {
    return { columns: GRID.columns, rows: GRID.rows, cardsPerPage: GRID.columns * GRID.rows };
  }

  // Never shrink card dimensions; reduce cards per page if needed.
  const columns = 2;
  const rows = 3;
  return { columns, rows, cardsPerPage: columns * rows };
}

function drawPrintSizingNote(page: ReturnType<PDFDocument["addPage"]>, font: Awaited<ReturnType<PDFDocument["embedFont"]>>) {
  page.drawText("Print at 100% / Actual size. Disable 'Fit to page'.", {
    x: 24,
    y: 18,
    size: 9,
    color: rgb(0.85, 0.85, 0.85),
    font,
  });
}

function drawCalibrationPage(page: ReturnType<PDFDocument["addPage"]>, font: Awaited<ReturnType<PDFDocument["embedFont"]>>) {
  const centerX = pageLayoutPoints.pageWidth / 2;
  const centerY = pageLayoutPoints.pageHeight / 2;
  const outlineX = centerX - calibrationLayout.cardOutlineWidth / 2;
  const outlineY = centerY - calibrationLayout.cardOutlineHeight / 2;

  page.drawText("Calibration Page", {
    x: 24,
    y: pageLayoutPoints.pageHeight - 30,
    size: 16,
    color: rgb(0.94, 0.94, 0.94),
    font,
  });
  page.drawText("Card outline is exactly 63mm x 88mm (178.58pt x 249.45pt).", {
    x: 24,
    y: pageLayoutPoints.pageHeight - 48,
    size: 10,
    color: rgb(0.8, 0.8, 0.8),
    font,
  });
  drawPrintSizingNote(page, font);

  page.drawRectangle({
    x: outlineX,
    y: outlineY,
    width: calibrationLayout.cardOutlineWidth,
    height: calibrationLayout.cardOutlineHeight,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
  });

  const lineX = centerX - calibrationLayout.referenceLinePoints / 2;
  const lineY = outlineY - 36;
  page.drawLine({
    start: { x: lineX, y: lineY },
    end: { x: lineX + calibrationLayout.referenceLinePoints, y: lineY },
    thickness: 1.5,
    color: rgb(0.85, 0.85, 0.85),
  });
  page.drawText("1 inch reference line", {
    x: lineX,
    y: lineY - 12,
    size: 9,
    color: rgb(0.8, 0.8, 0.8),
    font,
  });
}

export async function renderPlaytestPdf(images: ResolvedPrintableImage[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fallbackFont = await pdf.embedFont(StandardFonts.Helvetica);
  const grid = selectGridCapacity();
  const gridWidth = grid.columns * pageLayoutPoints.cardWidth;
  const gridHeight = grid.rows * pageLayoutPoints.cardHeight;
  const gridOrigin = {
    x: (pageLayoutPoints.pageWidth - gridWidth) / 2,
    y: (pageLayoutPoints.pageHeight - gridHeight) / 2,
  };

  const calibrationPage = pdf.addPage([pageLayoutPoints.pageWidth, pageLayoutPoints.pageHeight]);
  drawCalibrationPage(calibrationPage, fallbackFont);

  const pages = chunk(images, grid.cardsPerPage);

  for (const pageCards of pages) {
    const page = pdf.addPage([pageLayoutPoints.pageWidth, pageLayoutPoints.pageHeight]);

    for (let slot = 0; slot < pageCards.length; slot += 1) {
      const card = pageCards[slot];
      if (!card) {
        continue;
      }

      const column = slot % grid.columns;
      const rowFromTop = Math.floor(slot / grid.columns);

      const x = gridOrigin.x + column * pageLayoutPoints.cardWidth;
      const y = gridOrigin.y + (grid.rows - rowFromTop - 1) * pageLayoutPoints.cardHeight;

      const embedded = await embedCardImage(pdf, card);

      if (embedded) {
        page.drawImage(embedded, {
          x,
          y,
          width: pageLayoutPoints.cardWidth,
          height: pageLayoutPoints.cardHeight,
        });
      } else {
        page.drawRectangle({
          x,
          y,
          width: pageLayoutPoints.cardWidth,
          height: pageLayoutPoints.cardHeight,
          borderColor: rgb(0.5, 0.5, 0.5),
          borderWidth: 0.5,
          color: rgb(0.1, 0.1, 0.1),
        });

        page.drawText(card.name, {
          x: x + 8,
          y: y + pageLayoutPoints.cardHeight - 18,
          size: 9,
          color: rgb(0.95, 0.95, 0.95),
          font: fallbackFont,
          maxWidth: pageLayoutPoints.cardWidth - 16,
        });
      }
    }

    drawCutGuides(page, grid, gridOrigin);
    drawPrintSizingNote(page, fallbackFont);
  }

  return pdf.save();
}
