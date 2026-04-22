import type { DeckRecord, DeckValidationReport } from "@/modules/deck/domain/deck-record";

function isBasicLand(typeLine: string): boolean {
  return typeLine.toLowerCase().includes("basic") && typeLine.toLowerCase().includes("land");
}

function isColorSubset(cardColors: string[], commanderColors: string[]): boolean {
  return cardColors.every((color) => commanderColors.includes(color));
}

export function validateCommanderDeck(deck: DeckRecord, ownedByCardId: Map<string, number>): DeckValidationReport {
  const issues = [] as DeckValidationReport["issues"];
  const commanderEntries = deck.cards.filter((entry) => entry.zone === "commander");
  const mainboardEntries = deck.cards.filter((entry) => entry.zone === "mainboard");
  const cardCount =
    commanderEntries.reduce((sum, entry) => sum + entry.quantity, 0) +
    mainboardEntries.reduce((sum, entry) => sum + entry.quantity, 0);

  if (commanderEntries.length === 0) {
    issues.push({
      code: "missing_commander",
      message: "Commander slot is empty.",
    });
  }

  if (commanderEntries.length > 1) {
    issues.push({
      code: "multiple_commanders",
      message: "Only one commander is currently supported.",
    });
  }

  const commander = commanderEntries[0];

  if (commander && !commander.legalCommander) {
    issues.push({
      code: "invalid_commander",
      message: `${commander.name} is not legal as a commander.`,
      cardId: commander.cardId,
    });
  }

  const commanderColors = commander?.colorIdentity ?? [];

  if (cardCount > 100) {
    issues.push({
      code: "mainboard_overflow",
      message: `Deck currently has ${cardCount} cards. Commander decks must have 100 cards total.`,
    });
  }

  const byOracle = new Map<string, { cardId: string; quantity: number; basic: boolean }>();
  for (const entry of mainboardEntries) {
    const existing = byOracle.get(entry.oracleId);
    if (existing) {
      existing.quantity += entry.quantity;
    } else {
      byOracle.set(entry.oracleId, {
        cardId: entry.cardId,
        quantity: entry.quantity,
        basic: isBasicLand(entry.typeLine),
      });
    }

    if (commander && !isColorSubset(entry.colorIdentity, commanderColors)) {
      issues.push({
        code: "color_identity_violation",
        cardId: entry.cardId,
        message: `${entry.name} is outside the commander's color identity.`,
      });
    }

    const owned = ownedByCardId.get(entry.cardId) ?? Number.MAX_SAFE_INTEGER;
    if (entry.quantity > owned) {
      issues.push({
        code: "library_quantity_exceeded",
        cardId: entry.cardId,
        message: `${entry.name} exceeds owned quantity (${owned}).`,
      });
    }
  }

  for (const item of byOracle.values()) {
    if (!item.basic && item.quantity > 1) {
      issues.push({
        code: "duplicate_nonbasic",
        cardId: item.cardId,
        message: "Non-basic cards can only appear once in Commander.",
      });
    }
  }

  return {
    isValid: issues.length === 0,
    cardCount,
    commanderColorIdentity: commanderColors,
    issues,
  };
}
