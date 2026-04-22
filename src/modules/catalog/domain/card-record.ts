import type { PriceSnapshot } from "@/modules/pricing";

export const CARD_POOLS = ["all", "library"] as const;

export type CardPool = (typeof CARD_POOLS)[number];

export const CARD_SORTS = ["relevance", "name", "released"] as const;

export type CardSort = (typeof CARD_SORTS)[number];

export const CARD_COLORS = ["W", "U", "B", "R", "G"] as const;
export type CardColor = (typeof CARD_COLORS)[number];

export type CardLegalityStatus = "legal" | "not_legal" | "restricted" | "banned";

export type CardPriceSnapshot = PriceSnapshot;

export type CardImageUris = {
  normal: string | null;
  artCrop: string | null;
  borderCrop: string | null;
};

export type CardFaceRecord = {
  name: string;
  manaCost: string | null;
  typeLine: string;
  oracleText: string | null;
  imageUris: CardImageUris;
};

export type CardRulingRecord = {
  source: "wotc" | "scryfall";
  publishedAt: string;
  comment: string;
};

export type CardListItem = {
  id: string;
  oracleId: string;
  name: string;
  manaCost: string | null;
  typeLine: string;
  oracleText: string | null;
  imageUri: string | null;
  colorIdentity: string[];
  cmc: number;
  legalCommander: boolean;
  price: CardPriceSnapshot | null;
};

export type CardPrintingRecord = {
  id: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  rarity: string;
  releasedAt: string | null;
  finishes: string[];
  imageUris: CardImageUris;
  faces: CardFaceRecord[];
  price: CardPriceSnapshot | null;
};

export type CardDetailRecord = CardListItem & {
  imageUris: CardImageUris;
  faces: CardFaceRecord[];
  legalities: Record<string, CardLegalityStatus>;
  rulings: CardRulingRecord[];
  printings: CardPrintingRecord[];
};

export type CardSearchInput = {
  query?: string;
  colors?: string[];
  typeLine?: string;
  commanderOnly?: boolean;
  pool?: CardPool;
  sort?: CardSort;
  page?: number;
  pageSize?: number;
};

export type NormalizedCardSearchInput = {
  query: string;
  colors: string[];
  typeLine: string;
  commanderOnly: boolean;
  pool: CardPool;
  sort: CardSort;
  page: number;
  pageSize: number;
};

export type CardSearchResult = {
  items: CardListItem[];
  hasMore: boolean;
  nextPage: number | null;
  total: number | null;
};
