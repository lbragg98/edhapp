import { z } from "zod";
import type { DeckIntelligenceReport } from "@/modules/deck/domain/deck-intelligence";

const deckGuidanceCandidateViewSchema = z.object({
  cardId: z.string(),
  oracleId: z.string(),
  name: z.string(),
  manaCost: z.string().nullable(),
  typeLine: z.string(),
  imageUri: z.string().nullable(),
  priceUsd: z.number().nullable(),
  availableQuantity: z.number().nullable(),
  sourceMode: z.enum(["all", "library"]),
  reason: z.string(),
});

const deckGuidanceViewSchema = z.object({
  id: z.string(),
  category: z.enum(["mana_curve", "lands", "ramp", "draw", "interaction", "category_balance"]),
  severity: z.enum(["info", "watch", "risk"]),
  title: z.string(),
  summary: z.string(),
  rationale: z.string(),
  current: z.string(),
  target: z.string(),
  searchHint: z.string(),
  candidates: z.array(deckGuidanceCandidateViewSchema),
});

const deckSynergyViewSchema = z.object({
  id: z.string(),
  cardIds: z.array(z.string()),
  cardNames: z.array(z.string()),
  score: z.number(),
  reasons: z.array(z.string()),
  weights: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
    }),
  ),
});

const deckComboViewSchema = z.object({
  id: z.string(),
  source: z.string(),
  label: z.string(),
  description: z.string(),
  status: z.enum(["complete", "partial"]),
  pieces: z.array(
    z.object({
      name: z.string(),
      present: z.boolean(),
      cardId: z.string().optional(),
    }),
  ),
  missingCount: z.number(),
});

const deckIntelligenceViewSchema = z.object({
  sourceMode: z.enum(["all", "library"]),
  generatedAt: z.string(),
  recommendations: z.array(deckGuidanceViewSchema),
  synergies: z.array(deckSynergyViewSchema),
  combos: z.array(deckComboViewSchema),
  extensionPoints: z.object({
    playtestSimulationHook: z.literal("deck_intelligence_v1"),
    budgetAwareUpgradeHook: z.literal("pricing_overlay_v1"),
  }),
});

export function toDeckIntelligenceView(report: DeckIntelligenceReport) {
  return deckIntelligenceViewSchema.parse(report);
}

