import { z } from "zod";
import type { DeckUpgradeReport } from "@/modules/deck/domain/deck-upgrade";

const deckUpgradeReasonViewSchema = z.object({
  code: z.enum(["low_synergy", "redundancy", "poor_curve_fit", "better_alternative"]),
  message: z.string(),
  evidence: z.string(),
});

const deckUpgradeCardViewSchema = z.object({
  cardId: z.string(),
  oracleId: z.string(),
  name: z.string(),
  manaCost: z.string().nullable(),
  typeLine: z.string(),
  imageUri: z.string().nullable(),
  priceUsd: z.number().nullable(),
});

const deckUpgradeSuggestionViewSchema = z.object({
  id: z.string(),
  mode: z.enum(["all", "library"]),
  priority: z.enum(["high", "medium", "low"]),
  summary: z.string(),
  cut: deckUpgradeCardViewSchema,
  add: deckUpgradeCardViewSchema.extend({
    availableQuantity: z.number().nullable(),
  }),
  reasons: z.array(deckUpgradeReasonViewSchema),
  projectedPriceDeltaUsd: z.number().nullable(),
});

const deckUpgradeViewSchema = z.object({
  generatedAt: z.string(),
  mode: z.enum(["all", "library"]),
  suggestions: z.array(deckUpgradeSuggestionViewSchema),
});

export function toDeckUpgradeView(report: DeckUpgradeReport) {
  return deckUpgradeViewSchema.parse(report);
}

