import { z } from "zod";
import { CARD_COLORS, type CardColor } from "@/modules/catalog/domain/card-record";

const cardColorValueSchema = z.enum(CARD_COLORS);

function dedupeColors(colors: CardColor[]): CardColor[] {
  return [...new Set(colors)];
}

export function parseCardColorCsv(
  raw: string | undefined | null,
  context: string,
): CardColor[] | undefined {
  if (!raw) {
    return undefined;
  }

  const boundedRaw = raw.slice(0, 120);
  const tokens = boundedRaw
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 8);

  const accepted: CardColor[] = [];
  const rejected: string[] = [];

  for (const token of tokens) {
    const parsed = cardColorValueSchema.safeParse(token);
    if (parsed.success) {
      accepted.push(parsed.data);
      continue;
    }
    rejected.push(token);
  }

  if (rejected.length > 0) {
    console.warn("[Filters] Ignored invalid color values.", { context, raw: boundedRaw, rejected });
  }

  if (accepted.length === 0) {
    return undefined;
  }

  return dedupeColors(accepted);
}

export function parseCardColorsFromParam(
  raw: string | string[] | undefined,
  context: string,
): CardColor[] {
  if (Array.isArray(raw)) {
    const merged = raw.filter((entry): entry is string => typeof entry === "string").join(",");
    return parseCardColorCsv(merged, context) ?? [];
  }

  if (typeof raw !== "string") {
    return [];
  }

  return parseCardColorCsv(raw, context) ?? [];
}
