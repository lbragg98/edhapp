export type PendingImportCard = {
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
  price: {
    usd: number | null;
  } | null;
};

export type PendingImportItem = {
  card: PendingImportCard;
  confidence: number;
  addedAt: string;
  scanId: string;
};

export type PendingImportState = {
  items: PendingImportItem[];
};

const DEDUPE_WINDOW_MS = 5_000;

export function addPendingImport(
  state: PendingImportState,
  input: PendingImportItem,
): PendingImportState {
  const now = Date.now();
  const exists = state.items.some((item) => {
    const addedAt = new Date(item.addedAt).getTime();
    return item.card.id === input.card.id && now - addedAt < DEDUPE_WINDOW_MS;
  });

  if (exists) {
    return state;
  }

  return {
    items: [input, ...state.items].slice(0, 24),
  };
}

export function removePendingImport(
  state: PendingImportState,
  cardId: string,
): PendingImportState {
  return {
    items: state.items.filter((item) => item.card.id !== cardId),
  };
}
