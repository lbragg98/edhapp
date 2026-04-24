import { z } from "zod";
import type { DeckAnalyticsReport } from "@/modules/deck/domain/deck-analytics";

const densitySchema = z.object({ count: z.number(), ratio: z.number() });

export const deckAnalyticsViewSchema = z.object({
  totalCards: z.number(),
  mainboardCards: z.number(),
  manaCurve: z.array(z.object({ label: z.enum(["0", "1", "2", "3", "4", "5", "6+"]), count: z.number() })),
  landCount: z.number(),
  colorIdentityBalance: z.array(
    z.object({
      color: z.enum(["W", "U", "B", "R", "G"]),
      count: z.number(),
      ratio: z.number(),
    }),
  ),
  cardTypeDistribution: z.array(
    z.object({
      type: z.enum(["Land", "Creature", "Instant", "Sorcery", "Artifact", "Enchantment", "Planeswalker", "Battle", "Other"]),
      count: z.number(),
      ratio: z.number(),
    }),
  ),
  rampDensity: densitySchema,
  drawDensity: densitySchema,
  spotRemovalDensity: densitySchema,
  boardWipeDensity: densitySchema,
  recursionDensity: densitySchema,
  protectionDensity: densitySchema,
  winConditionDensity: densitySchema,
  healthIndicators: z.array(
    z.object({
      id: z.enum(["land_count", "ramp_density", "draw_density", "spot_removal_density", "board_wipe_density", "mana_curve"]),
      label: z.string(),
      value: z.string(),
      target: z.string(),
      status: z.enum(["good", "watch", "risk"]),
      description: z.string(),
    }),
  ),
  warnings: z.array(
    z.object({
      code: z.enum([
        "low_land_count",
        "high_land_count",
        "low_ramp_density",
        "low_draw_density",
        "low_spot_removal_density",
        "low_board_wipe_density",
        "shallow_curve_support",
      ]),
      message: z.string(),
    }),
  ),
});

export function toDeckAnalyticsView(analytics: DeckAnalyticsReport) {
  return deckAnalyticsViewSchema.parse(analytics);
}
