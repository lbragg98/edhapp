import type { PriceSnapshot } from "@/modules/pricing";

export const COLLECTION_FINISHES = ["NONFOIL", "FOIL", "ETCHED"] as const;
export type CollectionFinish = (typeof COLLECTION_FINISHES)[number];

export const COLLECTION_CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"] as const;
export type CollectionCondition = (typeof COLLECTION_CONDITIONS)[number];

export type LibraryRecord = {
  holdingId: string;
  entryId: string;
  cardId: string;
  oracleId: string;
  printingId: string | null;
  scryfallId: string;
  name: string;
  manaCost: string | null;
  typeLine: string;
  imageUri: string | null;
  colorIdentity: string[];
  setCode: string | null;
  setName: string | null;
  collectorNumber: string | null;
  finish: CollectionFinish;
  condition: CollectionCondition;
  quantity: number;
  note: string | null;
  price: PriceSnapshot | null;
};

export type LibrarySearchInput = {
  query?: string;
  colors?: string[];
  finish?: CollectionFinish;
  condition?: CollectionCondition;
  pageSize?: number;
};

export type NormalizedLibrarySearchInput = {
  query: string;
  colors: string[];
  finish: CollectionFinish | null;
  condition: CollectionCondition | null;
  pageSize: number;
};

export type AddLibraryCardInput = {
  scryfallCardId: string;
  quantity?: number;
  finish?: CollectionFinish;
  condition?: CollectionCondition;
  note?: string;
};

export type AdjustLibraryHoldingInput = {
  holdingId: string;
  delta: number;
};
