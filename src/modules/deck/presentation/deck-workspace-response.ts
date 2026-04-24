import { z } from "zod";
import { deckAnalyticsViewSchema } from "@/modules/deck/presentation/deck-analytics-view";
import { deckIntelligenceViewSchema } from "@/modules/deck/presentation/deck-intelligence-view";
import { deckValidationViewSchema } from "@/modules/deck/presentation/deck-validation-view";
import { deckListViewSchema, deckViewSchema } from "@/modules/deck/presentation/deck-view";

export const deckWorkspacePayloadSchema = z.object({
  deck: deckViewSchema,
  validation: deckValidationViewSchema,
  analytics: deckAnalyticsViewSchema,
  intelligence: deckIntelligenceViewSchema,
});

export type DeckWorkspacePayload = z.infer<typeof deckWorkspacePayloadSchema>;

export function parseDeckWorkspaceResponse(
  payload: unknown,
  context: string,
): DeckWorkspacePayload | null {
  const envelope = z.object({ data: z.unknown() }).safeParse(payload);
  if (!envelope.success) {
    console.warn("[Deck] Invalid deck workspace payload envelope.", {
      context,
      issues: envelope.error.issues,
    });
    return null;
  }

  const parsed = deckWorkspacePayloadSchema.safeParse(envelope.data.data);
  if (!parsed.success) {
    console.warn("[Deck] Invalid deck workspace payload body.", {
      context,
      issues: parsed.error.issues,
    });
    return null;
  }

  return parsed.data;
}

export function parseDeckListResponse(
  payload: unknown,
  context: string,
) {
  const envelope = z.object({ data: z.unknown() }).safeParse(payload);
  if (!envelope.success) {
    console.warn("[Deck] Invalid deck list payload envelope.", {
      context,
      issues: envelope.error.issues,
    });
    return null;
  }

  const parsed = deckListViewSchema.safeParse(envelope.data.data);
  if (!parsed.success) {
    console.warn("[Deck] Invalid deck list payload body.", {
      context,
      issues: parsed.error.issues,
    });
    return null;
  }

  return parsed.data;
}

