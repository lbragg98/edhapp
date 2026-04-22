import type { PriceSnapshot } from "@/modules/pricing";

export const CARD_SELECTION_SOURCES = ["all", "library"] as const;
export type CardSelectionSource = (typeof CARD_SELECTION_SOURCES)[number];

export type CardSelectionRecord = {
  source: CardSelectionSource;
  sourceItemId: string;
  cardId: string;
  printingId: string | null;
  scryfallId: string;
  title: string;
  subtitle: string;
  manaCost: string | null;
  imageUri: string | null;
  colorIdentity: string[];
  availableQuantity: number | null;
  price: PriceSnapshot | null;
};

export type DeckDragCardPayload = {
  source: CardSelectionSource;
  sourceItemId: string;
  cardId: string;
  printingId: string | null;
  scryfallId: string;
};

export function toDeckDragCardPayload(record: CardSelectionRecord): DeckDragCardPayload {
  return {
    source: record.source,
    sourceItemId: record.sourceItemId,
    cardId: record.cardId,
    printingId: record.printingId,
    scryfallId: record.scryfallId,
  };
}
