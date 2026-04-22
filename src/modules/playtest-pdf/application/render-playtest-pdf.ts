import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";
import {
  centeredGridOrigin,
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

function drawCutGuides(page: ReturnType<PDFDocument["addPage"]>) {
  const xStart = centeredGridOrigin.x;
  const yStart = centeredGridOrigin.y;
  const xEnd = xStart + gridLayoutPoints.width;
  const yEnd = yStart + gridLayoutPoints.height;

  for (let column = 0; column <= GRID.columns; column += 1) {
    const x = xStart + column * pageLayoutPoints.cardWidth;

    page.drawLine({
      start: { x, y: yStart - GUIDE.crosshairExtensionPoints },
      end: { x, y: yEnd + GUIDE.crosshairExtensionPoints },
      thickness: GUIDE.strokeWidthPoints,
      color: rgb(GUIDE.colorGray, GUIDE.colorGray, GUIDE.colorGray),
      opacity: GUIDE.colorOpacity,
    });
  }

  for (let row = 0; row <= GRID.rows; row += 1) {
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

export async function renderPlaytestPdf(images: ResolvedPrintableImage[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fallbackFont = await pdf.embedFont(StandardFonts.Helvetica);

  const pages = chunk(images, gridLayoutPoints.cardsPerPage);

  for (const pageCards of pages) {
    const page = pdf.addPage([pageLayoutPoints.pageWidth, pageLayoutPoints.pageHeight]);

    for (let slot = 0; slot < pageCards.length; slot += 1) {
      const card = pageCards[slot];
      if (!card) {
        continue;
      }

      const column = slot % GRID.columns;
      const rowFromTop = Math.floor(slot / GRID.columns);

      const x = centeredGridOrigin.x + column * pageLayoutPoints.cardWidth;
      const y = centeredGridOrigin.y + (GRID.rows - rowFromTop - 1) * pageLayoutPoints.cardHeight;

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

    drawCutGuides(page);
  }

  return pdf.save();
}
