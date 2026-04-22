import type { DeckSourceMode, DeckRecord } from "@/modules/deck/domain/deck-record";

export type DeckGuidanceSeverity = "info" | "watch" | "risk";

export type DeckGuidanceCategory =
  | "mana_curve"
  | "lands"
  | "ramp"
  | "draw"
  | "interaction"
  | "category_balance";

export type DeckGuidanceCandidate = {
  cardId: string;
  oracleId: string;
  name: string;
  manaCost: string | null;
  typeLine: string;
  imageUri: string | null;
  priceUsd: number | null;
  availableQuantity: number | null;
  sourceMode: DeckSourceMode;
  reason: string;
};

export type DeckGuidanceRecommendation = {
  id: string;
  category: DeckGuidanceCategory;
  severity: DeckGuidanceSeverity;
  title: string;
  summary: string;
  rationale: string;
  current: string;
  target: string;
  searchHint: string;
  candidates: DeckGuidanceCandidate[];
};

export type DeckSynergyWeight = {
  label: string;
  value: number;
};

export type DeckSynergySuggestion = {
  id: string;
  cardIds: string[];
  cardNames: string[];
  score: number;
  reasons: string[];
  weights: DeckSynergyWeight[];
};

export type DeckComboPiece = {
  name: string;
  present: boolean;
  cardId?: string;
};

export type DeckComboSuggestion = {
  id: string;
  source: string;
  label: string;
  description: string;
  status: "complete" | "partial";
  pieces: DeckComboPiece[];
  missingCount: number;
};

export type DeckIntelligenceReport = {
  sourceMode: DeckSourceMode;
  generatedAt: string;
  recommendations: DeckGuidanceRecommendation[];
  synergies: DeckSynergySuggestion[];
  combos: DeckComboSuggestion[];
  extensionPoints: {
    playtestSimulationHook: "deck_intelligence_v1";
    budgetAwareUpgradeHook: "pricing_overlay_v1";
  };
};

export type DeckSuggestionNeed =
  | "lands"
  | "ramp"
  | "draw"
  | "interaction"
  | "low_curve"
  | "creature_support";

export type DeckSuggestionSourceProvider = {
  suggestByNeed: (input: {
    need: DeckSuggestionNeed;
    sourceMode: DeckSourceMode;
    commanderColors: string[];
    limit: number;
  }) => Promise<DeckGuidanceCandidate[]>;
};

export type DeckIntelligenceContext = {
  deck: DeckRecord;
  sourceMode: DeckSourceMode;
  commanderColors: string[];
};

