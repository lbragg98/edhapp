import type { DeckRecord } from "@/modules/deck";
import type { GeneratePlaytestPdfOptions } from "@/modules/playtest-pdf/domain/playtest-pdf";
import { selectPrintableDeckCards } from "@/modules/playtest-pdf/application/select-printable-deck-cards";
import { resolvePrintableImages } from "@/modules/playtest-pdf/application/resolve-printable-images";
import { renderPlaytestPdf } from "@/modules/playtest-pdf/application/render-playtest-pdf";

export async function generateDeckPlaytestPdf(
  deck: DeckRecord,
  options: GeneratePlaytestPdfOptions = {},
): Promise<Uint8Array> {
  const printableCards = selectPrintableDeckCards(deck, options);

  if (printableCards.length === 0) {
    throw new Error("Deck has no printable cards.");
  }

  const resolvedImages = await resolvePrintableImages(printableCards);

  return renderPlaytestPdf(resolvedImages);
}
