import type { DeckAnalyticsReport, DeckCompositionWarning, DeckHealthIndicator } from "@/modules/deck/domain/deck-analytics";
import type { DeckRecord } from "@/modules/deck/domain/deck-record";

const COLORS = ["W", "U", "B", "R", "G"] as const;
const TYPE_ORDER = [
  "Land",
  "Creature",
  "Instant",
  "Sorcery",
  "Artifact",
  "Enchantment",
  "Planeswalker",
  "Battle",
  "Other",
] as const;

const manaBuckets = ["0", "1", "2", "3", "4", "5", "6+"] as const;

function toRatio(count: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Number((count / total).toFixed(4));
}

function classifyPrimaryType(typeLine: string) {
  const normalized = typeLine.toLowerCase();

  if (normalized.includes("land")) return "Land" as const;
  if (normalized.includes("creature")) return "Creature" as const;
  if (normalized.includes("instant")) return "Instant" as const;
  if (normalized.includes("sorcery")) return "Sorcery" as const;
  if (normalized.includes("artifact")) return "Artifact" as const;
  if (normalized.includes("enchantment")) return "Enchantment" as const;
  if (normalized.includes("planeswalker")) return "Planeswalker" as const;
  if (normalized.includes("battle")) return "Battle" as const;

  return "Other" as const;
}

function isLand(typeLine: string): boolean {
  return typeLine.toLowerCase().includes("land");
}

function hasAnyPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function parseApproximateCmc(manaCost: string | null): number {
  if (!manaCost) {
    return 0;
  }

  const matches = manaCost.match(/\{([^}]+)\}/g);

  if (!matches) {
    return 0;
  }

  return matches.reduce((sum, token) => {
    const value = token.replace(/[{}]/g, "");

    if (/^\d+$/.test(value)) {
      return sum + Number(value);
    }

    if (value === "X") {
      return sum;
    }

    return sum + 1;
  }, 0);
}

const rampPatterns = [
  /add\s+\{?[wubrgc]\}?/i,
  /add\s+.*mana/i,
  /search your library.*land/i,
  /create .*treasure/i,
  /costs?\s+\{?\d+\}? less/i,
];

const drawPatterns = [/draw\s+\w+\s+cards?/i, /draw a card/i, /investigate/i, /scry\s+\d+/i];
const spotRemovalPatterns = [
  /destroy target/i,
  /exile target/i,
  /counter target spell/i,
  /return target .* to .* hand/i,
];
const boardWipePatterns = [/destroy all/i, /exile all/i, /each creature/i, /all nonland permanents/i];
const recursionPatterns = [/return .* from your graveyard/i, /from your graveyard to your hand/i];
const protectionPatterns = [/hexproof/i, /indestructible/i, /protection from/i, /ward\s+\{?\d+/i, /phases out/i];
const winConditionPatterns = [/you win the game/i, /each opponent loses/i, /combat damage.*player/i];

function densityStatus(
  count: number,
  total: number,
  targetRatio: number,
): "good" | "watch" | "risk" {
  const ratio = toRatio(count, total);

  if (ratio >= targetRatio) {
    return "good";
  }

  if (ratio >= targetRatio * 0.75) {
    return "watch";
  }

  return "risk";
}

export function analyzeDeckComposition(deck: DeckRecord): DeckAnalyticsReport {
  const mainboard = deck.cards.filter((card) => card.zone === "mainboard");
  const commander = deck.cards.filter((card) => card.zone === "commander");
  const totalCards = deck.cards.reduce((sum, entry) => sum + entry.quantity, 0);
  const mainboardCards = mainboard.reduce((sum, entry) => sum + entry.quantity, 0);

  const manaCurveCounts = new Map<(typeof manaBuckets)[number], number>(manaBuckets.map((bucket) => [bucket, 0]));

  for (const entry of [...mainboard, ...commander]) {
    if (isLand(entry.typeLine)) {
      continue;
    }

    const cmc = parseApproximateCmc(entry.manaCost);
    const bucket = cmc >= 6 ? "6+" : String(Math.max(0, Math.min(5, cmc))) as (typeof manaBuckets)[number];
    manaCurveCounts.set(bucket, (manaCurveCounts.get(bucket) ?? 0) + entry.quantity);
  }

  const landCount = mainboard.filter((entry) => isLand(entry.typeLine)).reduce((sum, entry) => sum + entry.quantity, 0);

  const colorCounts = new Map<(typeof COLORS)[number], number>(COLORS.map((color) => [color, 0]));
  for (const entry of mainboard) {
    for (const color of entry.colorIdentity) {
      if (colorCounts.has(color as (typeof COLORS)[number])) {
        colorCounts.set(
          color as (typeof COLORS)[number],
          (colorCounts.get(color as (typeof COLORS)[number]) ?? 0) + entry.quantity,
        );
      }
    }
  }

  const totalColorSignals = Array.from(colorCounts.values()).reduce((sum, value) => sum + value, 0);

  const typeCounts = new Map<(typeof TYPE_ORDER)[number], number>(TYPE_ORDER.map((type) => [type, 0]));
  for (const entry of mainboard) {
    const type = classifyPrimaryType(entry.typeLine);
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + entry.quantity);
  }

  let rampCount = 0;
  let drawCount = 0;
  let spotRemovalCount = 0;
  let boardWipeCount = 0;
  let recursionCount = 0;
  let protectionCount = 0;
  let winConditionCount = 0;

  for (const entry of mainboard) {
    const text = `${entry.typeLine}\n${entry.oracleText ?? ""}`;

    if (hasAnyPattern(text, rampPatterns)) rampCount += entry.quantity;
    if (hasAnyPattern(text, drawPatterns)) drawCount += entry.quantity;
    if (hasAnyPattern(text, spotRemovalPatterns)) spotRemovalCount += entry.quantity;
    if (hasAnyPattern(text, boardWipePatterns)) boardWipeCount += entry.quantity;
    if (hasAnyPattern(text, recursionPatterns)) recursionCount += entry.quantity;
    if (hasAnyPattern(text, protectionPatterns)) protectionCount += entry.quantity;
    if (hasAnyPattern(text, winConditionPatterns)) winConditionCount += entry.quantity;
  }

  const warnings: DeckCompositionWarning[] = [];

  if (landCount < 34) warnings.push({ code: "low_land_count", message: "Land count is below the common Commander floor (34)." });
  if (landCount > 42) warnings.push({ code: "high_land_count", message: "Land count is high; spell density may be too low." });
  if (toRatio(rampCount, mainboardCards) < 0.1) warnings.push({ code: "low_ramp_density", message: "Ramp density is low for Commander pacing." });
  if (toRatio(drawCount, mainboardCards) < 0.1) warnings.push({ code: "low_draw_density", message: "Card draw density may cause stalls." });
  if (toRatio(spotRemovalCount, mainboardCards) < 0.08) warnings.push({ code: "low_spot_removal_density", message: "Spot removal density is low." });
  if (toRatio(boardWipeCount, mainboardCards) < 0.03) warnings.push({ code: "low_board_wipe_density", message: "Board wipe density is low." });

  const midCurve = (manaCurveCounts.get("2") ?? 0) + (manaCurveCounts.get("3") ?? 0) + (manaCurveCounts.get("4") ?? 0);
  if (toRatio(midCurve, Math.max(1, mainboardCards - landCount)) < 0.45) {
    warnings.push({ code: "shallow_curve_support", message: "Mana curve is skewed; consider strengthening the 2-4 CMC core." });
  }

  const healthIndicators: DeckHealthIndicator[] = [
    {
      id: "land_count",
      label: "Land Count",
      value: `${landCount}`,
      target: "34-40",
      status: landCount >= 34 && landCount <= 40 ? "good" : landCount >= 32 && landCount <= 42 ? "watch" : "risk",
      description: "Stable mana bases typically sit in this range.",
    },
    {
      id: "ramp_density",
      label: "Ramp Density",
      value: `${Math.round(toRatio(rampCount, mainboardCards) * 100)}%`,
      target: ">=10%",
      status: densityStatus(rampCount, mainboardCards, 0.1),
      description: "Early acceleration keeps Commander decks on curve.",
    },
    {
      id: "draw_density",
      label: "Card Draw",
      value: `${Math.round(toRatio(drawCount, mainboardCards) * 100)}%`,
      target: ">=10%",
      status: densityStatus(drawCount, mainboardCards, 0.1),
      description: "Draw package maintains consistency over long games.",
    },
    {
      id: "spot_removal_density",
      label: "Spot Removal",
      value: `${Math.round(toRatio(spotRemovalCount, mainboardCards) * 100)}%`,
      target: ">=8%",
      status: densityStatus(spotRemovalCount, mainboardCards, 0.08),
      description: "Flexible answers improve interaction quality.",
    },
    {
      id: "board_wipe_density",
      label: "Board Wipes",
      value: `${boardWipeCount}`,
      target: "3+",
      status: boardWipeCount >= 3 ? "good" : boardWipeCount >= 2 ? "watch" : "risk",
      description: "Reset tools help recover from snowball boards.",
    },
    {
      id: "mana_curve",
      label: "Curve Balance",
      value: `${Math.round(toRatio(midCurve, Math.max(1, mainboardCards - landCount)) * 100)}% in CMC 2-4`,
      target: ">=45%",
      status:
        toRatio(midCurve, Math.max(1, mainboardCards - landCount)) >= 0.45
          ? "good"
          : toRatio(midCurve, Math.max(1, mainboardCards - landCount)) >= 0.35
            ? "watch"
            : "risk",
      description: "A healthy mid-curve improves reliability.",
    },
  ];

  return {
    totalCards,
    mainboardCards,
    manaCurve: manaBuckets.map((bucket) => ({ label: bucket, count: manaCurveCounts.get(bucket) ?? 0 })),
    landCount,
    colorIdentityBalance: COLORS.map((color) => ({
      color,
      count: colorCounts.get(color) ?? 0,
      ratio: toRatio(colorCounts.get(color) ?? 0, totalColorSignals),
    })),
    cardTypeDistribution: TYPE_ORDER.map((type) => ({
      type,
      count: typeCounts.get(type) ?? 0,
      ratio: toRatio(typeCounts.get(type) ?? 0, mainboardCards),
    })),
    rampDensity: { count: rampCount, ratio: toRatio(rampCount, mainboardCards) },
    drawDensity: { count: drawCount, ratio: toRatio(drawCount, mainboardCards) },
    spotRemovalDensity: { count: spotRemovalCount, ratio: toRatio(spotRemovalCount, mainboardCards) },
    boardWipeDensity: { count: boardWipeCount, ratio: toRatio(boardWipeCount, mainboardCards) },
    recursionDensity: { count: recursionCount, ratio: toRatio(recursionCount, mainboardCards) },
    protectionDensity: { count: protectionCount, ratio: toRatio(protectionCount, mainboardCards) },
    winConditionDensity: { count: winConditionCount, ratio: toRatio(winConditionCount, mainboardCards) },
    healthIndicators,
    warnings,
  };
}
