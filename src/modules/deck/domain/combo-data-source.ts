export type KnownComboPattern = {
  id: string;
  label: string;
  description: string;
  pieces: string[];
  source: string;
};

export type ComboDataSource = {
  listKnownCombos: () => Promise<KnownComboPattern[]>;
};

