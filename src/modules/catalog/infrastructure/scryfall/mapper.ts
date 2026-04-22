import type { z } from "zod";
import type {
  CardDetailRecord,
  CardFaceRecord,
  CardImageUris,
  CardRulingRecord,
  CardListItem,
  CardPrintingRecord,
} from "@/modules/catalog/domain/card-record";
import { scryfallCardSchema, scryfallRawCardSchema } from "@/modules/catalog/infrastructure/scryfall/schemas";
import { parseExternalPrice } from "@/modules/pricing";

type ScryfallCard = z.infer<typeof scryfallCardSchema>;
type ScryfallRawCard = z.infer<typeof scryfallRawCardSchema>;
type ScryfallNormalizationIssueCode =
  | "schema_invalid"
  | "missing_id"
  | "missing_name";

export type ScryfallNormalizationIssue = {
  code: ScryfallNormalizationIssueCode;
  message: string;
};

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

function normalizeCommanderLegality(card: ScryfallRawCard): boolean {
  return card.legalities?.commander === "legal";
}

function normalizeName(card: ScryfallRawCard): string | null {
  if (card.name && card.name.trim().length > 0) {
    return card.name;
  }

  const firstFaceName = card.card_faces?.find((face) => face.name && face.name.trim().length > 0)?.name;
  return firstFaceName ?? null;
}

function normalizeTypeLine(card: ScryfallRawCard): string {
  if (card.type_line && card.type_line.trim().length > 0) {
    return card.type_line;
  }

  const firstFaceType = card.card_faces?.find((face) => face.type_line && face.type_line.trim().length > 0)?.type_line;
  return firstFaceType ?? "Unknown";
}

function normalizeColorIdentity(card: ScryfallRawCard): string[] {
  if (!card.color_identity) {
    return [];
  }

  return card.color_identity
    .map((color) => color.toUpperCase())
    .filter((color) => ["W", "U", "B", "R", "G"].includes(color));
}

function normalizeRawOracleId(card: ScryfallRawCard): string {
  return card.oracle_id ?? card.id ?? "";
}

function normalizeCmc(card: ScryfallRawCard): number {
  if (typeof card.cmc === "number" && Number.isFinite(card.cmc)) {
    return card.cmc;
  }

  return 0;
}

function toRawPriceSnapshot(card: ScryfallRawCard) {
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

function toRawImageUris(input: ScryfallRawCard["image_uris"]): CardImageUris {
  return {
    normal: input?.normal ?? null,
    artCrop: input?.art_crop ?? null,
    borderCrop: input?.border_crop ?? null,
  };
}

function resolveRawImageUris(card: ScryfallRawCard): CardImageUris {
  if (card.image_uris) {
    return toRawImageUris(card.image_uris);
  }

  const firstFace = card.card_faces?.find((face) => face.image_uris);
  return toRawImageUris(firstFace?.image_uris);
}

function mapRawFaces(card: ScryfallRawCard): CardFaceRecord[] {
  const name = normalizeName(card) ?? "Unknown";
  const typeLine = normalizeTypeLine(card);

  return (card.card_faces ?? []).map((face) => ({
    name: face.name ?? name,
    manaCost: face.mana_cost ?? null,
    typeLine: face.type_line ?? typeLine,
    oracleText: face.oracle_text ?? null,
    imageUris: toRawImageUris(face.image_uris),
  }));
}

export function normalizeScryfallRawCard(raw: unknown): {
  card: ScryfallRawCard | null;
  issues: ScryfallNormalizationIssue[];
} {
  const parsed = scryfallRawCardSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      card: null,
      issues: [{ code: "schema_invalid", message: parsed.error.issues[0]?.message ?? "Invalid raw card schema." }],
    };
  }

  const card = parsed.data;
  const issues: ScryfallNormalizationIssue[] = [];

  if (!card.id) {
    issues.push({ code: "missing_id", message: "Missing Scryfall card id." });
  }

  if (!normalizeName(card)) {
    issues.push({ code: "missing_name", message: "Missing card name." });
  }

  if (issues.length > 0) {
    return { card: null, issues };
  }

  return { card, issues };
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

export function mapScryfallRawCardToListItem(raw: unknown): {
  item: CardListItem | null;
  issues: ScryfallNormalizationIssue[];
} {
  const normalized = normalizeScryfallRawCard(raw);

  if (!normalized.card) {
    return { item: null, issues: normalized.issues };
  }

  const card = normalized.card;
  const imageUris = resolveRawImageUris(card);
  const name = normalizeName(card)!;
  const typeLine = normalizeTypeLine(card);

  return {
    item: {
      id: card.id!,
      oracleId: normalizeRawOracleId(card),
      name,
      manaCost: card.mana_cost ?? null,
      typeLine,
      oracleText: card.oracle_text ?? null,
      imageUri: imageUris.normal,
      colorIdentity: normalizeColorIdentity(card),
      cmc: normalizeCmc(card),
      legalCommander: normalizeCommanderLegality(card),
      price: toRawPriceSnapshot(card),
    },
    issues: normalized.issues,
  };
}

export function mapScryfallRawCardToPrinting(raw: unknown): {
  printing: CardPrintingRecord | null;
  issues: ScryfallNormalizationIssue[];
} {
  const normalized = normalizeScryfallRawCard(raw);

  if (!normalized.card) {
    return { printing: null, issues: normalized.issues };
  }

  const card = normalized.card;

  return {
    printing: {
      id: card.id!,
      setCode: card.set?.toUpperCase() ?? "",
      setName: card.set_name ?? "",
      collectorNumber: card.collector_number ?? "",
      rarity: card.rarity ?? "",
      releasedAt: card.released_at ?? null,
      finishes: card.finishes ?? [],
      imageUris: resolveRawImageUris(card),
      faces: mapRawFaces(card),
      price: toRawPriceSnapshot(card),
    },
    issues: normalized.issues,
  };
}

export function mapScryfallRawCardToDetail(
  raw: unknown,
  printings: CardPrintingRecord[],
  rulings: CardRulingRecord[],
): { detail: CardDetailRecord | null; issues: ScryfallNormalizationIssue[] } {
  const mapped = mapScryfallRawCardToListItem(raw);

  if (!mapped.item) {
    return { detail: null, issues: mapped.issues };
  }

  const normalized = normalizeScryfallRawCard(raw);
  if (!normalized.card) {
    return { detail: null, issues: normalized.issues };
  }

  const card = normalized.card;
  const legalities = Object.fromEntries(
    Object.entries(card.legalities ?? {}).map(([format, value]) => {
      if (value === "legal" || value === "not_legal" || value === "restricted" || value === "banned") {
        return [format, value] as const;
      }

      return [format, "not_legal"] as const;
    }),
  );

  return {
    detail: {
      ...mapped.item,
      imageUris: resolveRawImageUris(card),
      faces: mapRawFaces(card),
      legalities,
      rulings,
      printings,
    },
    issues: mapped.issues,
  };
}
