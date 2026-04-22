import type { PriceSnapshot } from "@/modules/pricing";

export const DECK_SOURCE_MODES = ["all", "library"] as const;
export type DeckSourceMode = (typeof DECK_SOURCE_MODES)[number];

export const DECK_CARD_ZONES = ["commander", "mainboard"] as const;
export type DeckCardZone = (typeof DECK_CARD_ZONES)[number];

export type DeckCardRecord = {
  id: string;
  cardId: string;
  oracleId: string;
  scryfallId: string;
  printingId: string | null;
  zone: DeckCardZone;
  quantity: number;
  name: string;
  manaCost: string | null;
  typeLine: string;
  oracleText: string | null;
  imageUri: string | null;
  colorIdentity: string[];
  legalCommander: boolean;
  note: string | null;
  price: PriceSnapshot | null;
};

export type DeckRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  notes: string | null;
  preferredSource: DeckSourceMode;
  tags: string[];
  cards: DeckCardRecord[];
  createdAt: string;
  updatedAt: string;
};

export type DeckValidationIssue = {
  code:
    | "missing_commander"
    | "invalid_commander"
    | "multiple_commanders"
    | "mainboard_overflow"
    | "duplicate_nonbasic"
    | "color_identity_violation"
    | "library_quantity_exceeded";
  message: string;
  cardId?: string;
};

export type DeckValidationReport = {
  isValid: boolean;
  cardCount: number;
  commanderColorIdentity: string[];
  issues: DeckValidationIssue[];
};

export type CreateDeckInput = {
  name: string;
  sourceMode?: DeckSourceMode;
  description?: string;
  notes?: string;
  tags?: string[];
};

export type UpdateDeckMetadataInput = {
  deckId: string;
  name?: string;
  description?: string;
  notes?: string;
  sourceMode?: DeckSourceMode;
  tags?: string[];
};

export type AddDeckCardInput = {
  deckId: string;
  sourceMode: DeckSourceMode;
  sourceItemId: string;
  cardId: string;
  scryfallId: string;
  printingId: string | null;
  zone: DeckCardZone;
};

export type AdjustDeckCardInput = {
  deckId: string;
  entryId: string;
  delta: number;
};
