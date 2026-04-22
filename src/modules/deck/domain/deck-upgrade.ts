export type DeckUpgradeMode = "all" | "library";

export type DeckUpgradeReasonCode =
  | "low_synergy"
  | "redundancy"
  | "poor_curve_fit"
  | "better_alternative";

export type DeckUpgradeReason = {
  code: DeckUpgradeReasonCode;
  message: string;
  evidence: string;
};

export type DeckUpgradeCardRef = {
  cardId: string;
  oracleId: string;
  name: string;
  manaCost: string | null;
  typeLine: string;
  imageUri: string | null;
  priceUsd: number | null;
};

export type DeckUpgradeSuggestion = {
  id: string;
  mode: DeckUpgradeMode;
  priority: "high" | "medium" | "low";
  summary: string;
  cut: DeckUpgradeCardRef;
  add: DeckUpgradeCardRef & {
    availableQuantity: number | null;
  };
  reasons: DeckUpgradeReason[];
  projectedPriceDeltaUsd: number | null;
};

export type DeckUpgradeReport = {
  generatedAt: string;
  mode: DeckUpgradeMode;
  suggestions: DeckUpgradeSuggestion[];
};

