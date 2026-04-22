import type { DeckCardRecord, DeckRecord } from "@/modules/deck";
import type { GeneratePlaytestPdfOptions, PlaytestPrintableCard } from "@/modules/playtest-pdf/domain/playtest-pdf";

function isBasicLand(entry: DeckCardRecord): boolean {
  return entry.typeLine.includes("Basic Land");
}

export function selectPrintableDeckCards(
  deck: DeckRecord,
  options: GeneratePlaytestPdfOptions = {},
): PlaytestPrintableCard[] {
  const selectedIdSet = options.selectedEntryIds ? new Set(options.selectedEntryIds) : null;
  const includeBasicLands = options.includeBasicLands ?? true;

  const cards: PlaytestPrintableCard[] = [];

  for (const entry of deck.cards) {
    if (selectedIdSet && !selectedIdSet.has(entry.id)) {
      continue;
    }

    if (!includeBasicLands && isBasicLand(entry)) {
      continue;
    }

    const copies = entry.zone === "commander" ? 1 : Math.max(0, entry.quantity);

    for (let index = 0; index < copies; index += 1) {
      cards.push({
        id: `${entry.id}-${index}`,
        name: entry.name,
        imageUri: entry.imageUri,
      });
    }
  }

  return cards;
}
