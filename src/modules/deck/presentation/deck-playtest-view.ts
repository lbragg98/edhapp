import { z } from "zod";
import type { DeckPlaytestReport } from "@/modules/deck/domain/deck-playtest";

const deckPlaytestViewSchema = z.object({
  runs: z.number(),
  turns: z.number(),
  keepableHandRate: z.number(),
  manaScrewRate: z.number(),
  manaFloodRate: z.number(),
  averageCommanderCastTurn: z.number().nullable(),
  commanderCastRate: z.number(),
  averageLandsByTurn: z.array(
    z.object({
      turn: z.number(),
      averageLandsInPlay: z.number(),
    }),
  ),
});

export function toDeckPlaytestView(report: DeckPlaytestReport) {
  return deckPlaytestViewSchema.parse(report);
}

