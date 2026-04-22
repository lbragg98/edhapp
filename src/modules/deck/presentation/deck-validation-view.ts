import { z } from "zod";

export const deckValidationIssueViewSchema = z.object({
  code: z.enum([
    "missing_commander",
    "invalid_commander",
    "multiple_commanders",
    "mainboard_overflow",
    "duplicate_nonbasic",
    "color_identity_violation",
    "library_quantity_exceeded",
  ]),
  message: z.string(),
  cardId: z.string().optional(),
});

export const deckValidationViewSchema = z.object({
  isValid: z.boolean(),
  cardCount: z.number(),
  commanderColorIdentity: z.array(z.string()),
  issues: z.array(deckValidationIssueViewSchema),
});

export function toDeckValidationView(validation: unknown) {
  return deckValidationViewSchema.parse(validation);
}
