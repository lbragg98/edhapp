import type { z } from "zod";
import type {
  CardDetailRecord,
  CardFaceRecord,
  CardImageUris,
  CardRulingRecord,
  CardListItem,
  CardPrintingRecord,
} from "@/modules/catalog/domain/card-record";
import { scryfallCardSchema } from "@/modules/catalog/infrastructure/scryfall/schemas";
import { parseExternalPrice } from "@/modules/pricing";

type ScryfallCard = z.infer<typeof scryfallCardSchema>;

function toImageUris(input: ScryfallCard["image_uris"]): CardImageUris {
  return {
    normal: input?.normal ?? null,
    artCrop: input?.art_crop ?? null,
    borderCrop: input?.border_crop ?? null,
  };
}

function resolveImageUris(card: ScryfallCard): CardImageUris {
  if (card.image_uris) {
    return toImageUris(card.image_uris);
  }

  const firstFace = card.card_faces?.find((face) => face.image_uris);

  return toImageUris(firstFace?.image_uris);
}

function mapFaces(card: ScryfallCard): CardFaceRecord[] {
  return (card.card_faces ?? []).map((face) => ({
    name: face.name ?? card.name,
    manaCost: face.mana_cost ?? null,
    typeLine: face.type_line ?? card.type_line,
    oracleText: face.oracle_text ?? null,
    imageUris: toImageUris(face.image_uris),
  }));
}

function normalizeOracleId(card: ScryfallCard): string {
  return card.oracle_id ?? card.id;
}

function legalCommander(card: ScryfallCard): boolean {
  return card.legalities.commander === "legal";
}

function toPriceSnapshot(card: ScryfallCard) {
  if (!card.prices) {
    return null;
  }

  return {
    source: "scryfall" as const,
    capturedAt: null,
    usd: parseExternalPrice(card.prices.usd),
    usdFoil: parseExternalPrice(card.prices.usd_foil),
    usdEtched: parseExternalPrice(card.prices.usd_etched),
    eur: parseExternalPrice(card.prices.eur),
    eurFoil: parseExternalPrice(card.prices.eur_foil),
    tix: parseExternalPrice(card.prices.tix),
  };
}

export function mapScryfallCardToListItem(card: ScryfallCard): CardListItem {
  const imageUris = resolveImageUris(card);

  return {
    id: card.id,
    oracleId: normalizeOracleId(card),
    name: card.name,
    manaCost: card.mana_cost ?? null,
    typeLine: card.type_line,
    oracleText: card.oracle_text ?? null,
    imageUri: imageUris.normal,
    colorIdentity: card.color_identity,
    cmc: card.cmc,
    legalCommander: legalCommander(card),
    price: toPriceSnapshot(card),
  };
}

export function mapScryfallCardToPrinting(card: ScryfallCard): CardPrintingRecord {
  return {
    id: card.id,
    setCode: card.set?.toUpperCase() ?? "",
    setName: card.set_name ?? "",
    collectorNumber: card.collector_number ?? "",
    rarity: card.rarity ?? "",
    releasedAt: card.released_at ?? null,
    finishes: card.finishes ?? [],
    imageUris: resolveImageUris(card),
    faces: mapFaces(card),
    price: toPriceSnapshot(card),
  };
}

export function mapScryfallCardToDetail(
  card: ScryfallCard,
  printings: CardPrintingRecord[],
  rulings: CardRulingRecord[],
): CardDetailRecord {
  return {
    ...mapScryfallCardToListItem(card),
    imageUris: resolveImageUris(card),
    faces: mapFaces(card),
    legalities: card.legalities,
    rulings,
    printings,
  };
}
