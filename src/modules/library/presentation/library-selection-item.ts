import type { LibraryRecord } from "@/modules/library/domain/library-record";
import type { CardSelectionItem } from "@/modules/catalog";

export function toLibrarySelectionItems(records: LibraryRecord[]): CardSelectionItem[] {
  return records.map((record) => ({
    id: record.holdingId,
    title: record.name,
    subtitle: record.typeLine,
    manaCost: record.manaCost,
    imageUri: record.imageUri,
    colorIdentity: record.colorIdentity,
    legalCommander: true,
    price: record.price,
    selection: {
      source: "library",
      sourceItemId: record.holdingId,
      cardId: record.oracleId,
      printingId: record.printingId,
      scryfallId: record.scryfallId,
      title: record.name,
      subtitle: record.typeLine,
      manaCost: record.manaCost,
      imageUri: record.imageUri,
      colorIdentity: record.colorIdentity,
      availableQuantity: record.quantity,
      price: record.price,
    },
  }));
}
