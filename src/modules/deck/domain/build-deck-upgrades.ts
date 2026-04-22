import type { DeckAnalyticsReport } from "@/modules/deck/domain/deck-analytics";
import type { DeckIntelligenceReport } from "@/modules/deck/domain/deck-intelligence";
import type { DeckSuggestionNeed, DeckSuggestionSourceProvider } from "@/modules/deck/domain/deck-intelligence";
import type { DeckCardRecord, DeckRecord } from "@/modules/deck/domain/deck-record";
import type { DeckUpgradeMode, DeckUpgradeReason, DeckUpgradeReport, DeckUpgradeSuggestion } from "@/modules/deck/domain/deck-upgrade";

function parseApproximateCmc(manaCost: string | null): number {
  if (!manaCost) return 0;
  const matches = manaCost.match(/\{([^}]+)\}/g);
  if (!matches) return 0;

  return matches.reduce((sum, token) => {
    const value = token.replace(/[{}]/g, "");
    if (/^\d+$/.test(value)) return sum + Number(value);
    if (value === "X") return sum;
    return sum + 1;
  }, 0);
}

function isLand(typeLine: string): boolean {
  return typeLine.toLowerCase().includes("land");
}

function toRoleTags(card: DeckCardRecord): Set<string> {
  const text = `${card.typeLine}\n${card.oracleText ?? ""}`.toLowerCase();
  const tags = new Set<string>();
  if (/draw a card|draw .* cards?|investigate|scry \d+/i.test(text)) tags.add("draw");
  if (/add .*mana|create .*treasure|search your library.*land/i.test(text)) tags.add("ramp");
  if (/destroy target|exile target|counter target spell|return target .* to .* hand/i.test(text)) tags.add("interaction");
  if (/board wipe|destroy all|exile all|all creatures/i.test(text)) tags.add("wipe");
  if (/token/i.test(text)) tags.add("tokens");
  if (/graveyard|return .* from your graveyard/i.test(text)) tags.add("graveyard");
  return tags;
}

function buildNeedQueue(analytics: DeckAnalyticsReport): DeckSuggestionNeed[] {
  const needs: DeckSuggestionNeed[] = [];
  if (analytics.landCount < 34) needs.push("lands");
  if (analytics.rampDensity.ratio < 0.1) needs.push("ramp");
  if (analytics.drawDensity.ratio < 0.1) needs.push("draw");
  if (analytics.spotRemovalDensity.ratio + analytics.boardWipeDensity.ratio < 0.11) needs.push("interaction");
  if (analytics.warnings.some((warning) => warning.code === "shallow_curve_support")) needs.push("low_curve");
  if (needs.length === 0) needs.push("creature_support");
  return needs;
}

function mapNeedLabel(need: DeckSuggestionNeed): string {
  if (need === "lands") return "land stability";
  if (need === "ramp") return "ramp package";
  if (need === "draw") return "card draw consistency";
  if (need === "interaction") return "interaction density";
  if (need === "low_curve") return "mana curve smoothing";
  return "category balance";
}

function buildSynergyParticipation(intelligence: DeckIntelligenceReport): Map<string, number> {
  const map = new Map<string, number>();
  for (const synergy of intelligence.synergies) {
    for (const cardId of synergy.cardIds) {
      map.set(cardId, (map.get(cardId) ?? 0) + synergy.score);
    }
  }
  return map;
}

function chooseCutCandidate(input: {
  deck: DeckRecord;
  need: DeckSuggestionNeed;
  synergyParticipation: Map<string, number>;
}): { card: DeckCardRecord; reasons: DeckUpgradeReason[] } | null {
  const roleCounts = new Map<string, number>();
  const cards = input.deck.cards.filter((entry) => entry.zone === "mainboard" && !isLand(entry.typeLine));

  for (const card of cards) {
    for (const tag of toRoleTags(card)) {
      roleCounts.set(tag, (roleCounts.get(tag) ?? 0) + 1);
    }
  }

  const scored = cards.map((card) => {
    const cmc = parseApproximateCmc(card.manaCost);
    const synergy = input.synergyParticipation.get(card.cardId) ?? 0;
    const tags = toRoleTags(card);
    const roleRedundancy = [...tags].reduce((sum, tag) => sum + Math.max(0, (roleCounts.get(tag) ?? 0) - 8), 0);
    const curvePenalty = cmc >= 6 ? 1 : cmc >= 5 ? 0.45 : 0;
    const lowSynergyPenalty = Math.max(0, 0.6 - synergy);

    let needPenalty = 0;
    if (input.need === "lands" || input.need === "low_curve") {
      needPenalty += curvePenalty;
    }
    if (input.need === "ramp" && !tags.has("ramp")) needPenalty += 0.3;
    if (input.need === "draw" && !tags.has("draw")) needPenalty += 0.3;
    if (input.need === "interaction" && !tags.has("interaction")) needPenalty += 0.25;

    return {
      card,
      score: Number((curvePenalty + lowSynergyPenalty + roleRedundancy * 0.05 + needPenalty).toFixed(4)),
      cmc,
      synergy,
      roleRedundancy,
    };
  });

  const top = scored.sort((left, right) => right.score - left.score)[0];
  if (!top) return null;

  const reasons: DeckUpgradeReason[] = [];
  if (top.synergy < 0.35) {
    reasons.push({
      code: "low_synergy",
      message: "Low synergy footprint in current deck pairings.",
      evidence: `Synergy participation score ${top.synergy.toFixed(2)} is below the preferred range.`,
    });
  }
  if (top.roleRedundancy > 0) {
    reasons.push({
      code: "redundancy",
      message: "This slot appears role-redundant.",
      evidence: "Deck has multiple cards competing for the same tactical role.",
    });
  }
  if (top.cmc >= 5) {
    reasons.push({
      code: "poor_curve_fit",
      message: "High mana value contributes to curve drag.",
      evidence: `Approximate mana value ${top.cmc} pressures early turn consistency.`,
    });
  }

  if (reasons.length === 0) {
    reasons.push({
      code: "poor_curve_fit",
      message: "Swap supports cleaner early sequencing.",
      evidence: "Selected as the lowest-fit nonland slot for the current upgrade target.",
    });
  }

  return {
    card: top.card,
    reasons,
  };
}

export async function buildDeckUpgrades(input: {
  deck: DeckRecord;
  analytics: DeckAnalyticsReport;
  intelligence: DeckIntelligenceReport;
  mode: DeckUpgradeMode;
  commanderColors: string[];
  sourceProvider: DeckSuggestionSourceProvider;
}): Promise<DeckUpgradeReport> {
  const needs = buildNeedQueue(input.analytics).slice(0, 4);
  const synergyParticipation = buildSynergyParticipation(input.intelligence);
  const suggestions: DeckUpgradeSuggestion[] = [];

  for (const need of needs) {
    const candidates = await input.sourceProvider.suggestByNeed({
      need,
      sourceMode: input.mode,
      commanderColors: input.commanderColors,
      limit: 4,
    });
    const add = candidates[0];
    if (!add) {
      continue;
    }

    const cut = chooseCutCandidate({
      deck: input.deck,
      need,
      synergyParticipation,
    });
    if (!cut) {
      continue;
    }

    const reasons: DeckUpgradeReason[] = [
      ...cut.reasons,
      {
        code: "better_alternative",
        message: "Alternative offers stronger fit for current deck needs.",
        evidence: `Suggested add improves ${mapNeedLabel(need)} in ${input.mode === "library" ? "owned-only" : "all-card"} mode.`,
      },
    ];

    suggestions.push({
      id: `upgrade-${need}-${cut.card.id}-${add.cardId}`,
      mode: input.mode,
      priority: need === "lands" || need === "ramp" || need === "draw" ? "high" : "medium",
      summary: `Replace ${cut.card.name} with ${add.name} to improve ${mapNeedLabel(need)}.`,
      cut: {
        cardId: cut.card.cardId,
        oracleId: cut.card.oracleId,
        name: cut.card.name,
        manaCost: cut.card.manaCost,
        typeLine: cut.card.typeLine,
        imageUri: cut.card.imageUri,
        priceUsd: cut.card.price?.usd ?? null,
      },
      add: {
        cardId: add.cardId,
        oracleId: add.oracleId,
        name: add.name,
        manaCost: add.manaCost,
        typeLine: add.typeLine,
        imageUri: add.imageUri,
        priceUsd: add.priceUsd,
        availableQuantity: add.availableQuantity,
      },
      reasons,
      projectedPriceDeltaUsd: (() => {
        const cutPrice = cut.card.price?.usd ?? null;
        if (add.priceUsd === null || cutPrice === null) {
          return null;
        }
        return Number((add.priceUsd - cutPrice).toFixed(2));
      })(),
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: input.mode,
    suggestions: suggestions.slice(0, 6),
  };
}
