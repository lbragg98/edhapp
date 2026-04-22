import type { CardDetailRecord, CardPrintingRecord } from "@/modules/catalog";

export type CardGalleryItem = {
  id: string;
  label: string;
  src: string;
  section: "card" | "print" | "face";
};

function pushIfValue(
  target: CardGalleryItem[],
  id: string,
  label: string,
  src: string | null,
  section: CardGalleryItem["section"],
) {
  if (!src) {
    return;
  }

  target.push({ id, label, src, section });
}

function pushImageVariants(
  target: CardGalleryItem[],
  baseId: string,
  labelPrefix: string,
  imageUris: { normal: string | null; artCrop: string | null; borderCrop: string | null },
  section: CardGalleryItem["section"],
) {
  pushIfValue(target, `${baseId}-normal`, `${labelPrefix} • Normal`, imageUris.normal, section);
  pushIfValue(target, `${baseId}-art`, `${labelPrefix} • Art Crop`, imageUris.artCrop, section);
  pushIfValue(target, `${baseId}-border`, `${labelPrefix} • Border Crop`, imageUris.borderCrop, section);
}

function addFaceImages(target: CardGalleryItem[], printing: CardPrintingRecord, printLabel: string) {
  printing.faces.forEach((face, index) => {
    pushImageVariants(
      target,
      `${printing.id}-face-${index}`,
      `${printLabel} • ${face.name}`,
      face.imageUris,
      "face",
    );
  });
}

export function buildCardImageGallery(card: CardDetailRecord, selectedPrintingId: string | null): CardGalleryItem[] {
  const items: CardGalleryItem[] = [];

  pushImageVariants(items, card.id, card.name, card.imageUris, "card");

  card.faces.forEach((face, index) => {
    pushImageVariants(items, `${card.id}-face-${index}`, face.name, face.imageUris, "face");
  });

  const scopedPrintings = selectedPrintingId
    ? card.printings.filter((printing) => printing.id === selectedPrintingId)
    : card.printings;

  scopedPrintings.forEach((printing) => {
    const printLabel = `${printing.setCode} #${printing.collectorNumber}`;
    pushImageVariants(items, printing.id, printLabel, printing.imageUris, "print");
    addFaceImages(items, printing, printLabel);
  });

  return items;
}

