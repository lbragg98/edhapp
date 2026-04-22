import type { CardSelectionRecord, CardSelectionSource } from "@/modules/selection";

export type DeckSourceQuery = {
  mode: CardSelectionSource;
  query?: string;
  colors?: string[];
  typeLine?: string;
  commanderOnly?: boolean;
  limit?: number;
};

export type DeckSourceResult = {
  mode: CardSelectionSource;
  items: CardSelectionRecord[];
};
