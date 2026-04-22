import type { ComboDataSource } from "@/modules/deck/domain/combo-data-source";
import type { DeckAnalyticsReport } from "@/modules/deck/domain/deck-analytics";
import type {
  DeckComboSuggestion,
  DeckGuidanceRecommendation,
  DeckIntelligenceContext,
  DeckIntelligenceReport,
  DeckSuggestionNeed,
  DeckSuggestionSourceProvider,
  DeckSynergySuggestion,
  DeckSynergyWeight,
} from "@/modules/deck/domain/deck-intelligence";
import type { DeckCardRecord } from "@/modules/deck/domain/deck-record";

const mainboardTypes = new Set([
  "Land",
  "Creature",
  "Instant",
  "Sorcery",
  "Artifact",
  "Enchantment",
  "Planeswalker",
  "Battle",
]);

function toPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
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
    if (/^\d+$/.test(value)) return sum + Number(value);
    if (value === "X") return sum;
    return sum + 1;
  }, 0);
}

function toRoleTags(card: DeckCardRecord): Set<string> {
  const text = `${card.typeLine}\n${card.oracleText ?? ""}`.toLowerCase();
  const tags = new Set<string>();

  if (/draw a card|draw .* cards?|investigate|scry \d+/i.test(text)) tags.add("draw");
  if (/add .*mana|create .*treasure|search your library.*land/i.test(text)) tags.add("ramp");
  if (/destroy target|exile target|counter target spell|return target .* to .* hand/i.test(text)) tags.add("interaction");
  if (/graveyard|dies|return .* from your graveyard/i.test(text)) tags.add("graveyard");
  if (/\+1\/\+1 counter|proliferate/i.test(text)) tags.add("counters");
  if (/token/i.test(text)) tags.add("tokens");
  if (/sacrifice/i.test(text)) tags.add("sacrifice");
  if (/lifelink|gain life|whenever you gain life/i.test(text)) tags.add("lifegain");
  if (/instant|sorcery/i.test(card.typeLine.toLowerCase())) tags.add("spells");
  if (/artifact/i.test(card.typeLine.toLowerCase())) tags.add("artifacts");
  if (/creature/i.test(card.typeLine.toLowerCase())) tags.add("creatures");

  return tags;
}

async function buildGuidance(input: {
  analytics: DeckAnalyticsReport;
  context: DeckIntelligenceContext;
  sourceProvider: DeckSuggestionSourceProvider;
}): Promise<DeckGuidanceRecommendation[]> {
  const recommendations: DeckGuidanceRecommendation[] = [];
  const { analytics, context } = input;

  const rules: Array<{
    id: string;
    need: DeckSuggestionNeed;
    category: DeckGuidanceRecommendation["category"];
    severity: DeckGuidanceRecommendation["severity"];
    title: string;
    summary: string;
    rationale: string;
    current: string;
    target: string;
    searchHint: string;
    shouldRecommend: boolean;
  }> = [
    {
      id: "lands-floor",
      need: "lands",
      category: "lands",
      severity: analytics.landCount < 32 ? "risk" : "watch",
      title: "Land count is below Commander stability range",
      summary: "Increase land count to reduce early-game stalls and mulligan pressure.",
      rationale: "Commander decks generally perform more consistently at 34-40 lands.",
      current: `${analytics.landCount} lands`,
      target: "34-40 lands",
      searchHint: "land utility",
      shouldRecommend: analytics.landCount < 34,
    },
    {
      id: "ramp-density",
      need: "ramp",
      category: "ramp",
      severity: analytics.rampDensity.ratio < 0.08 ? "risk" : "watch",
      title: "Ramp density is low",
      summary: "Add acceleration pieces so turns 3-5 stay on schedule.",
      rationale: "Most Commander lists target at least ~10% ramp package density.",
      current: `${analytics.rampDensity.count} cards (${toPercent(analytics.rampDensity.ratio)})`,
      target: ">=10%",
      searchHint: "mana ramp",
      shouldRecommend: analytics.rampDensity.ratio < 0.1,
    },
    {
      id: "draw-density",
      need: "draw",
      category: "draw",
      severity: analytics.drawDensity.ratio < 0.08 ? "risk" : "watch",
      title: "Card draw density is light",
      summary: "Increase draw engines to keep resources flowing across long multiplayer games.",
      rationale: "Commander tables punish decks that cannot refill consistently.",
      current: `${analytics.drawDensity.count} cards (${toPercent(analytics.drawDensity.ratio)})`,
      target: ">=10%",
      searchHint: "draw cards",
      shouldRecommend: analytics.drawDensity.ratio < 0.1,
    },
    {
      id: "interaction-density",
      need: "interaction",
      category: "interaction",
      severity:
        analytics.spotRemovalDensity.ratio + analytics.boardWipeDensity.ratio < 0.08 ? "risk" : "watch",
      title: "Interaction package is undersized",
      summary: "Increase spot removal and sweepers to answer opposing engines.",
      rationale: "Reliable interaction prevents snowball boards and protects your game plan.",
      current: `${analytics.spotRemovalDensity.count + analytics.boardWipeDensity.count} cards (${toPercent(
        analytics.spotRemovalDensity.ratio + analytics.boardWipeDensity.ratio,
      )})`,
      target: ">=11%",
      searchHint: "destroy target permanent",
      shouldRecommend: analytics.spotRemovalDensity.ratio + analytics.boardWipeDensity.ratio < 0.11,
    },
    {
      id: "mana-curve-balance",
      need: "low_curve",
      category: "mana_curve",
      severity: analytics.warnings.some((warning) => warning.code === "shallow_curve_support") ? "watch" : "info",
      title: "Curve support can be smoothed",
      summary: "Raise your 2-4 CMC density to improve opening-sequence consistency.",
      rationale: "Mid-curve concentration improves play pattern reliability in multiplayer pacing.",
      current: `${toPercent(
        ((analytics.manaCurve.find((entry) => entry.label === "2")?.count ?? 0) +
          (analytics.manaCurve.find((entry) => entry.label === "3")?.count ?? 0) +
          (analytics.manaCurve.find((entry) => entry.label === "4")?.count ?? 0)) /
          Math.max(1, analytics.mainboardCards - analytics.landCount),
      )} in 2-4 CMC`,
      target: ">=45%",
      searchHint: "efficient value creature",
      shouldRecommend: analytics.warnings.some((warning) => warning.code === "shallow_curve_support"),
    },
    {
      id: "category-balance",
      need: "creature_support",
      category: "category_balance",
      severity: "watch",
      title: "Mainboard type balance can be improved",
      summary: "Current type distribution is skewed away from a balanced support core.",
      rationale: "Healthy category spread makes plans resilient to disruption.",
      current: analytics.cardTypeDistribution
        .filter((entry) => mainboardTypes.has(entry.type))
        .sort((a, b) => b.ratio - a.ratio)
        .slice(0, 2)
        .map((entry) => `${entry.type} ${toPercent(entry.ratio)}`)
        .join(", "),
      target: "Core categories in sustainable proportions",
      searchHint: "value creature",
      shouldRecommend: (() => {
        const creatureRatio =
          analytics.cardTypeDistribution.find((entry) => entry.type === "Creature")?.ratio ?? 0;
        const nonlandSpellRatio = Math.max(0, 1 - (analytics.landCount / Math.max(1, analytics.mainboardCards)));
        return creatureRatio < 0.2 && nonlandSpellRatio > 0.55;
      })(),
    },
  ];

  for (const rule of rules.filter((rule) => rule.shouldRecommend)) {
    const candidates = await input.sourceProvider.suggestByNeed({
      need: rule.need,
      sourceMode: context.sourceMode,
      commanderColors: context.commanderColors,
      limit: 4,
    });

    recommendations.push({
      id: rule.id,
      category: rule.category,
      severity: rule.severity,
      title: rule.title,
      summary: rule.summary,
      rationale: rule.rationale,
      current: rule.current,
      target: rule.target,
      searchHint: rule.searchHint,
      candidates,
    });
  }

  return recommendations;
}

function buildSynergies(deck: DeckIntelligenceContext["deck"]): DeckSynergySuggestion[] {
  const cards = deck.cards.filter((entry) => entry.zone === "mainboard" || entry.zone === "commander");
  const result: DeckSynergySuggestion[] = [];

  for (let index = 0; index < cards.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < cards.length; nextIndex += 1) {
      const left = cards[index]!;
      const right = cards[nextIndex]!;

      const leftTags = toRoleTags(left);
      const rightTags = toRoleTags(right);

      const weights: DeckSynergyWeight[] = [];
      const reasons: string[] = [];

      const leftColors = new Set(left.colorIdentity);
      const rightColors = new Set(right.colorIdentity);
      const sharedColors = [...leftColors].filter((color) => rightColors.has(color));
      if (sharedColors.length > 0) {
        const colorWeight = Math.min(0.22, sharedColors.length * 0.08);
        weights.push({ label: "shared_color_identity", value: colorWeight });
        reasons.push(`Shared color identity (${sharedColors.join("/")}) supports overlapping game plans.`);
      }

      const sharedTags = [...leftTags].filter((tag) => rightTags.has(tag));
      if (sharedTags.length > 0) {
        const tagWeight = Math.min(0.48, sharedTags.length * 0.12);
        weights.push({ label: "shared_gameplay_tags", value: tagWeight });
        reasons.push(`Both cards reinforce ${sharedTags.slice(0, 3).join(", ")} themes.`);
      }

      const leftCmc = parseApproximateCmc(left.manaCost);
      const rightCmc = parseApproximateCmc(right.manaCost);
      if (Math.abs(leftCmc - rightCmc) <= 1) {
        weights.push({ label: "curve_alignment", value: 0.08 });
        reasons.push("Mana value alignment helps smooth sequencing.");
      }

      if ((leftTags.has("sacrifice") && rightTags.has("graveyard")) || (rightTags.has("sacrifice") && leftTags.has("graveyard"))) {
        weights.push({ label: "sacrifice_graveyard_link", value: 0.2 });
        reasons.push("Sacrifice and graveyard recursion loops create resilient value.");
      }

      const score = Number(weights.reduce((sum, weight) => sum + weight.value, 0).toFixed(4));
      if (score < 0.28) {
        continue;
      }

      result.push({
        id: `${left.id}:${right.id}`,
        cardIds: [left.cardId, right.cardId],
        cardNames: [left.name, right.name],
        score,
        reasons,
        weights,
      });
    }
  }

  return result.sort((a, b) => b.score - a.score).slice(0, 8);
}

async function buildCombos(input: {
  context: DeckIntelligenceContext;
  comboDataSource: ComboDataSource;
}): Promise<DeckComboSuggestion[]> {
  const knownCombos = await input.comboDataSource.listKnownCombos();
  const byName = new Map<string, DeckCardRecord>();
  for (const card of input.context.deck.cards) {
    byName.set(normalizeName(card.name), card);
  }

  return knownCombos
    .map((combo) => {
      const pieces = combo.pieces.map((pieceName) => {
        const card = byName.get(normalizeName(pieceName));
        return {
          name: pieceName,
          present: Boolean(card),
          ...(card ? { cardId: card.cardId } : {}),
        };
      });

      const presentCount = pieces.filter((piece) => piece.present).length;
      if (presentCount === 0) {
        return null;
      }

      const missingCount = pieces.length - presentCount;
      return {
        id: combo.id,
        source: combo.source,
        label: combo.label,
        description: combo.description,
        status: missingCount === 0 ? "complete" : "partial",
        pieces,
        missingCount,
      } as DeckComboSuggestion;
    })
    .filter((entry): entry is DeckComboSuggestion => entry !== null)
    .sort((a, b) => a.missingCount - b.missingCount)
    .slice(0, 8);
}

export async function buildDeckIntelligence(input: {
  analytics: DeckAnalyticsReport;
  context: DeckIntelligenceContext;
  sourceProvider: DeckSuggestionSourceProvider;
  comboDataSource: ComboDataSource;
}): Promise<DeckIntelligenceReport> {
  const recommendations = await buildGuidance({
    analytics: input.analytics,
    context: input.context,
    sourceProvider: input.sourceProvider,
  });
  const synergies = buildSynergies(input.context.deck);
  const combos = await buildCombos({
    context: input.context,
    comboDataSource: input.comboDataSource,
  });

  return {
    sourceMode: input.context.sourceMode,
    generatedAt: new Date().toISOString(),
    recommendations,
    synergies,
    combos,
    extensionPoints: {
      playtestSimulationHook: "deck_intelligence_v1",
      budgetAwareUpgradeHook: "pricing_overlay_v1",
    },
  };
}
