import type { CardListItem } from "@/modules/catalog/domain/card-record";
import type { CardSelectionRecord } from "@/modules/selection";
import type { PriceSnapshot } from "@/modules/pricing";

export type CardSelectionItem = {
  id: string;
  title: string;
  subtitle: string;
  manaCost: string | null;
  imageUri: string | null;
  colorIdentity: string[];
  legalCommander: boolean;
  price: PriceSnapshot | null;
  selection: CardSelectionRecord;
};

export function toCardSelectionItems(cards: CardListItem[]): CardSelectionItem[] {
  return cards.map((card) => ({
    id: card.id,
    title: card.name,
    subtitle: card.typeLine,
    manaCost: card.manaCost,
    imageUri: card.imageUri,
    colorIdentity: card.colorIdentity,
    legalCommander: card.legalCommander,
    price: card.price,
    selection: {
      source: "all",
      sourceItemId: card.id,
      cardId: card.oracleId,
      printingId: card.id,
      scryfallId: card.id,
      title: card.name,
      subtitle: card.typeLine,
      manaCost: card.manaCost,
      imageUri: card.imageUri,
      colorIdentity: card.colorIdentity,
      availableQuantity: null,
      price: card.price,
    },
  }));
}
