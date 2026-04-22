import type { DeckRecord } from "@/modules/deck/domain/deck-record";
import type { DeckPlaytestInput, DeckPlaytestReport } from "@/modules/deck/domain/deck-playtest";

type SimCard = {
  id: string;
  isLand: boolean;
  cmc: number;
  isRamp: boolean;
};

type SimState = {
  hand: SimCard[];
  library: SimCard[];
  landsInPlay: number;
  virtualRampSources: number;
  commanderCastTurn: number | null;
};

const rampPatterns = [
  /add\s+.*mana/i,
  /search your library.*land/i,
  /create .*treasure/i,
];

function isLand(typeLine: string): boolean {
  return typeLine.toLowerCase().includes("land");
}

function parseApproximateCmc(manaCost: string | null): number {
  if (!manaCost) return 0;
  const matches = manaCost.match(/\{([^}]+)\}/g);
  if (!matches) return 0;

  return matches.reduce((sum, token) => {
    const value = token.replace(/[{}]/g, "");
    if (/^\d+$/.test(value)) return sum + Number(value);
    if (value === "X") return sum;
    return sum + 1;
  }, 0);
}

function toSimDeck(deck: DeckRecord): {
  mainboard: SimCard[];
  commanderCmc: number | null;
} {
  const mainboard: SimCard[] = [];
  let commanderCmc: number | null = null;

  for (const entry of deck.cards) {
    const cmc = parseApproximateCmc(entry.manaCost);
    if (entry.zone === "commander") {
      commanderCmc = cmc;
      continue;
    }

    for (let index = 0; index < entry.quantity; index += 1) {
      const text = `${entry.typeLine}\n${entry.oracleText ?? ""}`;
      mainboard.push({
        id: `${entry.id}-${index}`,
        isLand: isLand(entry.typeLine),
        cmc,
        isRamp: rampPatterns.some((pattern) => pattern.test(text)),
      });
    }
  }

  return { mainboard, commanderCmc };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const left = copy[index]!;
    copy[index] = copy[swap]!;
    copy[swap] = left;
  }
  return copy;
}

function draw(library: SimCard[], count: number): SimCard[] {
  const cards: SimCard[] = [];
  for (let index = 0; index < count; index += 1) {
    const next = library.shift();
    if (!next) break;
    cards.push(next);
  }
  return cards;
}

function handStats(cards: SimCard[]): { lands: number; cheapSpells: number; ramp: number } {
  let lands = 0;
  let cheapSpells = 0;
  let ramp = 0;
  for (const card of cards) {
    if (card.isLand) lands += 1;
    if (!card.isLand && card.cmc <= 3) cheapSpells += 1;
    if (card.isRamp) ramp += 1;
  }

  return { lands, cheapSpells, ramp };
}

function isKeepable(cards: SimCard[]): boolean {
  const stats = handStats(cards);
  if (stats.lands < 2 || stats.lands > 5) return false;
  return stats.cheapSpells + stats.ramp >= 1;
}

function applyLondonBottoming(cards: SimCard[], mulligansTaken: number): SimCard[] {
  if (mulligansTaken <= 0) return cards;
  const sorted = [...cards].sort((left, right) => {
    if (left.isLand !== right.isLand) return left.isLand ? 1 : -1;
    return right.cmc - left.cmc;
  });
  return sorted.slice(0, Math.max(0, cards.length - mulligansTaken));
}

function buildOpeningState(mainboard: SimCard[]): {
  state: SimState;
  keepable: boolean;
} {
  const maxMulligans = 2;
  let mulligansTaken = 0;
  let keepable = false;
  let hand: SimCard[] = [];
  let library: SimCard[] = [];

  for (let attempt = 0; attempt <= maxMulligans; attempt += 1) {
    library = shuffle(mainboard);
    hand = draw(library, 7);
    const currentKeepable = isKeepable(hand);

    if (currentKeepable || attempt === maxMulligans) {
      keepable = currentKeepable;
      mulligansTaken = attempt;
      break;
    }
  }

  const finalHand = applyLondonBottoming(hand, mulligansTaken);

  return {
    state: {
      hand: finalHand,
      library,
      landsInPlay: 0,
      virtualRampSources: 0,
      commanderCastTurn: null,
    },
    keepable,
  };
}

function simulateTurn(state: SimState, turn: number, commanderCmc: number | null): number {
  if (turn > 1) {
    state.hand.push(...draw(state.library, 1));
  }

  const landIndex = state.hand.findIndex((card) => card.isLand);
  if (landIndex >= 0) {
    state.hand.splice(landIndex, 1);
    state.landsInPlay += 1;
  }

  const availableMana = state.landsInPlay + state.virtualRampSources;
  const rampPlayable = state.hand.findIndex((card) => card.isRamp && !card.isLand && card.cmc <= availableMana);
  if (rampPlayable >= 0) {
    state.hand.splice(rampPlayable, 1);
    state.virtualRampSources += 1;
  }

  if (commanderCmc !== null && state.commanderCastTurn === null) {
    const currentMana = state.landsInPlay + state.virtualRampSources;
    if (currentMana >= commanderCmc) {
      state.commanderCastTurn = turn;
    }
  }

  return state.landsInPlay;
}

export function runDeckPlaytest(deck: DeckRecord, input: DeckPlaytestInput): DeckPlaytestReport {
  const { mainboard, commanderCmc } = toSimDeck(deck);
  const runs = Math.max(20, Math.min(2000, Math.trunc(input.runs)));
  const turns = Math.max(4, Math.min(10, Math.trunc(input.turns)));

  const landsByTurn = Array.from({ length: turns }, () => 0);
  let keepableCount = 0;
  let screwCount = 0;
  let floodCount = 0;
  let commanderCastCount = 0;
  let commanderCastTurnSum = 0;

  for (let run = 0; run < runs; run += 1) {
    const opening = buildOpeningState(mainboard);
    if (opening.keepable) keepableCount += 1;
    const state = opening.state;

    for (let turn = 1; turn <= turns; turn += 1) {
      const lands = simulateTurn(state, turn, commanderCmc);
      landsByTurn[turn - 1]! += lands;
    }

    if (state.landsInPlay <= 2) screwCount += 1;
    if (state.landsInPlay >= 7) floodCount += 1;

    if (state.commanderCastTurn !== null) {
      commanderCastCount += 1;
      commanderCastTurnSum += state.commanderCastTurn;
    }
  }

  return {
    runs,
    turns,
    keepableHandRate: Number((keepableCount / runs).toFixed(4)),
    manaScrewRate: Number((screwCount / runs).toFixed(4)),
    manaFloodRate: Number((floodCount / runs).toFixed(4)),
    averageCommanderCastTurn:
      commanderCastCount > 0 ? Number((commanderCastTurnSum / commanderCastCount).toFixed(2)) : null,
    commanderCastRate: Number((commanderCastCount / runs).toFixed(4)),
    averageLandsByTurn: landsByTurn.map((sum, index) => ({
      turn: index + 1,
      averageLandsInPlay: Number((sum / runs).toFixed(2)),
    })),
  };
}
