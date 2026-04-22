export type DeckHealthStatus = "good" | "watch" | "risk";

export type DeckCompositionWarningCode =
  | "low_land_count"
  | "high_land_count"
  | "low_ramp_density"
  | "low_draw_density"
  | "low_spot_removal_density"
  | "low_board_wipe_density"
  | "shallow_curve_support";

export type DeckCompositionWarning = {
  code: DeckCompositionWarningCode;
  message: string;
};

export type DeckManaCurveBucket = {
  label: "0" | "1" | "2" | "3" | "4" | "5" | "6+";
  count: number;
};

export type DeckColorBalanceEntry = {
  color: "W" | "U" | "B" | "R" | "G";
  count: number;
  ratio: number;
};

export type DeckTypeDistributionEntry = {
  type: "Land" | "Creature" | "Instant" | "Sorcery" | "Artifact" | "Enchantment" | "Planeswalker" | "Battle" | "Other";
  count: number;
  ratio: number;
};

export type DeckDensityMetric = {
  count: number;
  ratio: number;
};

export type DeckHealthIndicator = {
  id:
    | "land_count"
    | "ramp_density"
    | "draw_density"
    | "spot_removal_density"
    | "board_wipe_density"
    | "mana_curve";
  label: string;
  value: string;
  target: string;
  status: DeckHealthStatus;
  description: string;
};

export type DeckAnalyticsReport = {
  totalCards: number;
  mainboardCards: number;
  manaCurve: DeckManaCurveBucket[];
  landCount: number;
  colorIdentityBalance: DeckColorBalanceEntry[];
  cardTypeDistribution: DeckTypeDistributionEntry[];
  rampDensity: DeckDensityMetric;
  drawDensity: DeckDensityMetric;
  spotRemovalDensity: DeckDensityMetric;
  boardWipeDensity: DeckDensityMetric;
  recursionDensity: DeckDensityMetric;
  protectionDensity: DeckDensityMetric;
  winConditionDensity: DeckDensityMetric;
  healthIndicators: DeckHealthIndicator[];
  warnings: DeckCompositionWarning[];
};
