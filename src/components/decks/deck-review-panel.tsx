import { formatUsd } from "@/modules/pricing";
import type {
  DeckAnalyticsReport,
  DeckIntelligenceReport,
  DeckPlaytestReport,
  DeckUpgradeMode,
  DeckUpgradeReport,
  DeckValidationReport,
} from "@/modules/deck";

type DeckReviewPanelProps = {
  analytics: DeckAnalyticsReport;
  validation: DeckValidationReport;
  intelligence: DeckIntelligenceReport;
  playtest: DeckPlaytestReport | null;
  isRunningPlaytest: boolean;
  onRunPlaytest: (options?: { runs?: number; turns?: number }) => Promise<void>;
  upgrades: DeckUpgradeReport | null;
  upgradeMode: DeckUpgradeMode;
  isLoadingUpgrades: boolean;
  onLoadUpgrades: (mode: DeckUpgradeMode) => Promise<void>;
  activeTab: "analytics" | "validation" | "guidance" | "playtest";
  onChangeTab: (tab: "analytics" | "validation" | "guidance" | "playtest") => void;
};

function statusClasses(status: "good" | "watch" | "risk") {
  if (status === "good") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (status === "watch") return "border-amber-400/30 bg-amber-500/10 text-amber-200";

  return "border-rose-400/30 bg-rose-500/10 text-rose-200";
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function DeckReviewPanel({
  analytics,
  validation,
  intelligence,
  playtest,
  isRunningPlaytest,
  onRunPlaytest,
  upgrades,
  upgradeMode,
  isLoadingUpgrades,
  onLoadUpgrades,
  activeTab,
  onChangeTab,
}: DeckReviewPanelProps) {
  const recommendationSeverityClass = {
    info: "border-white/20 bg-white/[0.03] text-zinc-200",
    watch: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    risk: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  } as const;

  return (
    <section className="surface-panel p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="type-label">Deck Review</p>
        <div className="flex gap-2">
          <button
            type="button"
            className={`nav-link ${activeTab === "analytics" ? "nav-link-active" : ""}`}
            onClick={() => onChangeTab("analytics")}
          >
            Composition
          </button>
          <button
            type="button"
            className={`nav-link ${activeTab === "validation" ? "nav-link-active" : ""}`}
            onClick={() => onChangeTab("validation")}
          >
            Validation
          </button>
          <button
            type="button"
            className={`nav-link ${activeTab === "guidance" ? "nav-link-active" : ""}`}
            onClick={() => onChangeTab("guidance")}
          >
            Guidance
          </button>
          <button
            type="button"
            className={`nav-link ${activeTab === "playtest" ? "nav-link-active" : ""}`}
            onClick={() => onChangeTab("playtest")}
          >
            Playtest
          </button>
        </div>
      </div>

      {activeTab === "analytics" ? (
        <div className="mt-4 space-y-5">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.healthIndicators.map((indicator) => (
              <article key={indicator.id} className={`rounded-xl border px-3 py-2 ${statusClasses(indicator.status)}`}>
                <p className="text-xs font-medium uppercase tracking-wide">{indicator.label}</p>
                <p className="mt-1 text-sm font-semibold">{indicator.value}</p>
                <p className="text-[11px] opacity-85">Target {indicator.target}</p>
              </article>
            ))}
          </div>

          <div>
            <p className="type-label">Mana Curve</p>
            <div className="mt-2 flex items-end gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              {analytics.manaCurve.map((bucket) => {
                const max = Math.max(1, ...analytics.manaCurve.map((entry) => entry.count));
                const height = `${Math.max(12, Math.round((bucket.count / max) * 62))}px`;

                return (
                  <div key={bucket.label} className="flex flex-1 flex-col items-center gap-1">
                    <div className="w-full rounded-md bg-white/10" style={{ height }} />
                    <p className="text-[10px] text-[color:var(--text-subtle)]">{bucket.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="type-label">Type Distribution</p>
              <div className="mt-2 space-y-1.5">
                {analytics.cardTypeDistribution
                  .filter((entry) => entry.count > 0)
                  .map((entry) => (
                    <div key={entry.type} className="flex items-center justify-between text-xs text-zinc-300">
                      <span>{entry.type}</span>
                      <span>{entry.count} ({percent(entry.ratio)})</span>
                    </div>
                  ))}
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="type-label">Color Identity Balance</p>
              <div className="mt-2 space-y-1.5 text-xs text-zinc-300">
                {analytics.colorIdentityBalance.map((entry) => (
                  <div key={entry.color} className="flex items-center justify-between">
                    <span>{entry.color}</span>
                    <span>{entry.count} ({percent(entry.ratio)})</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="type-label">Role Density</p>
              <div className="mt-2 space-y-1.5 text-xs text-zinc-300">
                <div className="flex items-center justify-between"><span>Ramp</span><span>{analytics.rampDensity.count} ({percent(analytics.rampDensity.ratio)})</span></div>
                <div className="flex items-center justify-between"><span>Draw</span><span>{analytics.drawDensity.count} ({percent(analytics.drawDensity.ratio)})</span></div>
                <div className="flex items-center justify-between"><span>Spot Removal</span><span>{analytics.spotRemovalDensity.count} ({percent(analytics.spotRemovalDensity.ratio)})</span></div>
                <div className="flex items-center justify-between"><span>Board Wipes</span><span>{analytics.boardWipeDensity.count} ({percent(analytics.boardWipeDensity.ratio)})</span></div>
                <div className="flex items-center justify-between"><span>Recursion</span><span>{analytics.recursionDensity.count} ({percent(analytics.recursionDensity.ratio)})</span></div>
                <div className="flex items-center justify-between"><span>Protection</span><span>{analytics.protectionDensity.count} ({percent(analytics.protectionDensity.ratio)})</span></div>
                <div className="flex items-center justify-between"><span>Win Conditions</span><span>{analytics.winConditionDensity.count} ({percent(analytics.winConditionDensity.ratio)})</span></div>
              </div>
            </article>
          </div>

          <div>
            <p className="type-label">Composition Warnings</p>
            <div className="mt-2 space-y-1.5">
              {analytics.warnings.length === 0 ? (
                <p className="text-sm text-emerald-300">Composition baseline looks healthy.</p>
              ) : (
                analytics.warnings.map((warning) => (
                  <p key={warning.code} className="text-sm text-amber-300">{warning.message}</p>
                ))
              )}
            </div>
          </div>
        </div>
      ) : activeTab === "validation" ? (
        <div className="mt-4 space-y-2">
          {validation.issues.length === 0 ? (
            <p className="text-sm text-emerald-300">No structural issues detected.</p>
          ) : (
            validation.issues.map((issue, index) => (
              <p key={`${issue.code}-${index}`} className="text-sm text-amber-300">
                {issue.message}
              </p>
            ))
          )}
        </div>
      ) : activeTab === "guidance" ? (
        <div className="mt-4 space-y-5">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="type-label">Deck Upgrades</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`nav-link ${upgradeMode === "all" ? "nav-link-active" : ""}`}
                  onClick={() => onLoadUpgrades("all")}
                  disabled={isLoadingUpgrades}
                >
                  All Cards
                </button>
                <button
                  type="button"
                  className={`nav-link ${upgradeMode === "library" ? "nav-link-active" : ""}`}
                  onClick={() => onLoadUpgrades("library")}
                  disabled={isLoadingUpgrades}
                >
                  Owned Only
                </button>
              </div>
            </div>

            <div className="mt-2 space-y-2">
              {isLoadingUpgrades ? (
                <p className="text-sm text-[color:var(--text-subtle)]">Calculating explainable upgrades...</p>
              ) : upgrades && upgrades.suggestions.length > 0 ? (
                upgrades.suggestions.map((suggestion) => (
                  <article key={suggestion.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="text-sm font-medium text-zinc-100">{suggestion.summary}</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-md border border-rose-400/20 bg-rose-500/5 p-2">
                        <p className="text-[11px] uppercase tracking-wide text-rose-200">Cut</p>
                        <p className="text-xs text-zinc-100">{suggestion.cut.name}</p>
                        <p className="text-[11px] text-zinc-400">{suggestion.cut.typeLine}</p>
                      </div>
                      <div className="rounded-md border border-emerald-400/20 bg-emerald-500/5 p-2">
                        <p className="text-[11px] uppercase tracking-wide text-emerald-200">Add</p>
                        <p className="text-xs text-zinc-100">{suggestion.add.name}</p>
                        <p className="text-[11px] text-zinc-400">
                          {suggestion.add.typeLine}
                          {suggestion.add.availableQuantity !== null ? ` • Owned ${suggestion.add.availableQuantity}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      {suggestion.reasons.map((reason, index) => (
                        <p key={`${suggestion.id}-${reason.code}-${index}`} className="text-[11px] text-zinc-300">
                          {reason.message} — {reason.evidence}
                        </p>
                      ))}
                    </div>
                    {suggestion.projectedPriceDeltaUsd !== null ? (
                      <p className="mt-1 text-[11px] text-[color:var(--text-subtle)]">
                        Price delta {formatUsd(suggestion.projectedPriceDeltaUsd)}
                      </p>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="text-sm text-[color:var(--text-subtle)]">
                  No upgrade suggestions for this mode yet. Try switching mode or re-running after edits.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="type-label">Deterministic Recommendations</p>
            <div className="mt-2 space-y-2">
              {intelligence.recommendations.length === 0 ? (
                <p className="text-sm text-emerald-300">No major guidance flags at current thresholds.</p>
              ) : (
                intelligence.recommendations.map((recommendation) => (
                  <article
                    key={recommendation.id}
                    className={`rounded-xl border p-3 ${recommendationSeverityClass[recommendation.severity]}`}
                  >
                    <p className="text-sm font-semibold">{recommendation.title}</p>
                    <p className="mt-1 text-xs opacity-85">{recommendation.summary}</p>
                    <p className="mt-2 text-[11px] opacity-85">
                      Current {recommendation.current} • Target {recommendation.target}
                    </p>
                    <p className="mt-1 text-[11px] opacity-80">{recommendation.rationale}</p>
                    {recommendation.candidates.length > 0 ? (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {recommendation.candidates.map((candidate) => (
                          <div key={`${recommendation.id}-${candidate.cardId}`} className="rounded-lg border border-white/10 bg-black/20 p-2">
                            <p className="text-xs font-medium text-zinc-100">{candidate.name}</p>
                            <p className="text-[11px] text-zinc-300">{candidate.typeLine}</p>
                            <p className="text-[11px] text-zinc-400">
                              {candidate.sourceMode === "library" && candidate.availableQuantity !== null
                                ? `Owned ${candidate.availableQuantity}`
                                : "All-card pool candidate"}
                              {candidate.priceUsd !== null ? ` • ${formatUsd(candidate.priceUsd)}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-[11px] opacity-80">
                        No in-mode candidates surfaced yet. Search hint: {recommendation.searchHint}
                      </p>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="type-label">Top Synergies</p>
              <div className="mt-2 space-y-2">
                {intelligence.synergies.length === 0 ? (
                  <p className="text-sm text-[color:var(--text-subtle)]">No strong pair signals yet.</p>
                ) : (
                  intelligence.synergies.slice(0, 5).map((synergy) => (
                    <div key={synergy.id} className="rounded-lg border border-white/10 px-2 py-2">
                      <p className="text-xs font-medium text-zinc-100">{synergy.cardNames.join(" + ")}</p>
                      <p className="text-[11px] text-zinc-300">Score {Math.round(synergy.score * 100)}/100</p>
                      <p className="mt-1 text-[11px] text-zinc-400">{synergy.reasons[0] ?? "Tagged heuristic overlap."}</p>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="type-label">Known Combo Signals</p>
              <div className="mt-2 space-y-2">
                {intelligence.combos.length === 0 ? (
                  <p className="text-sm text-[color:var(--text-subtle)]">No combo overlaps detected from current seed set.</p>
                ) : (
                  intelligence.combos.map((combo) => (
                    <div key={combo.id} className="rounded-lg border border-white/10 px-2 py-2">
                      <p className="text-xs font-medium text-zinc-100">{combo.label}</p>
                      <p className="text-[11px] text-zinc-300">
                        {combo.status === "complete" ? "Complete" : `${combo.missingCount} piece(s) missing`}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-400">{combo.description}</p>
                    </div>
                  ))
                )}
              </div>
            </article>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="type-label">Goldfish Simulator</p>
            <div className="flex gap-2">
              <button type="button" className="nav-link" onClick={() => onRunPlaytest({ runs: 250, turns: 7 })} disabled={isRunningPlaytest}>
                {isRunningPlaytest ? "Running..." : "Run 250"}
              </button>
              <button type="button" className="nav-link nav-link-active" onClick={() => onRunPlaytest({ runs: 800, turns: 7 })} disabled={isRunningPlaytest}>
                Deep 800
              </button>
            </div>
          </div>

          {!playtest ? (
            <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-4 text-sm text-[color:var(--text-subtle)]">
              Run a simulation to evaluate opening hands, mulligans, mana development, and commander timing.
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <article className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="type-label">Keepable Hands</p>
                  <p className="mt-2 text-lg font-semibold text-zinc-100">{Math.round(playtest.keepableHandRate * 100)}%</p>
                </article>
                <article className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="type-label">Commander Cast Avg</p>
                  <p className="mt-2 text-lg font-semibold text-zinc-100">
                    {playtest.averageCommanderCastTurn ? `T${playtest.averageCommanderCastTurn}` : "N/A"}
                  </p>
                </article>
                <article className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="type-label">Commander Cast Rate</p>
                  <p className="mt-2 text-lg font-semibold text-zinc-100">{Math.round(playtest.commanderCastRate * 100)}%</p>
                </article>
                <article className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="type-label">Mana Screw</p>
                  <p className="mt-2 text-lg font-semibold text-zinc-100">{Math.round(playtest.manaScrewRate * 100)}%</p>
                </article>
                <article className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="type-label">Mana Flood</p>
                  <p className="mt-2 text-lg font-semibold text-zinc-100">{Math.round(playtest.manaFloodRate * 100)}%</p>
                </article>
              </div>

              <article className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="type-label">Average Lands By Turn</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {playtest.averageLandsByTurn.map((entry) => (
                    <div key={entry.turn} className="flex items-center justify-between rounded-lg border border-white/10 px-2 py-2 text-xs text-zinc-300">
                      <span>Turn {entry.turn}</span>
                      <span>{entry.averageLandsInPlay.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </article>
            </>
          )}
        </div>
      )}
    </section>
  );
}
