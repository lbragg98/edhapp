export type DeckPlaytestInput = {
  runs: number;
  turns: number;
};

export type DeckPlaytestTurnMetric = {
  turn: number;
  averageLandsInPlay: number;
};

export type DeckPlaytestReport = {
  runs: number;
  turns: number;
  keepableHandRate: number;
  manaScrewRate: number;
  manaFloodRate: number;
  averageCommanderCastTurn: number | null;
  commanderCastRate: number;
  averageLandsByTurn: DeckPlaytestTurnMetric[];
};

