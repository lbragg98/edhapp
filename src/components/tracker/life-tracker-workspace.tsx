"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import {
  COMMANDER_LIFE_PRESETS,
  createInitialTrackerState,
  lifeTrackerReducer,
  parsePersistedTrackerState,
  serializeTrackerState,
  TRACKER_PLAYER_MAX,
  TRACKER_PLAYER_MIN,
  type TrackerPlayer,
} from "@/modules/tracker";

const STORAGE_KEY = "command-tower.life-tracker.v1";

function StatAdjuster({
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.02] px-3 py-2">
      <p className="type-label">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button type="button" className="nav-link px-3 py-2 text-base" onClick={onDecrease}>
          -
        </button>
        <span className="text-lg font-semibold text-zinc-100">{value}</span>
        <button type="button" className="nav-link nav-link-active px-3 py-2 text-base" onClick={onIncrease}>
          +
        </button>
      </div>
    </div>
  );
}

function PlayerPanel({
  player,
  opponents,
  isMonarch,
  isInitiative,
  counterNames,
  onNameChange,
  onAdjustLife,
  onAdjustPoison,
  onToggleMonarch,
  onToggleInitiative,
  onAdjustCommanderDamage,
  onAdjustCounter,
}: {
  player: TrackerPlayer;
  opponents: TrackerPlayer[];
  isMonarch: boolean;
  isInitiative: boolean;
  counterNames: string[];
  onNameChange: (name: string) => void;
  onAdjustLife: (delta: number) => void;
  onAdjustPoison: (delta: number) => void;
  onToggleMonarch: () => void;
  onToggleInitiative: () => void;
  onAdjustCommanderDamage: (sourcePlayerId: string, delta: number) => void;
  onAdjustCounter: (name: string, delta: number) => void;
}) {
  const maxCommanderDamage = Math.max(0, ...Object.values(player.commanderDamageTaken));

  return (
    <article className="surface-card space-y-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <input
          value={player.name}
          onChange={(event) => onNameChange(event.target.value)}
          className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-base text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
          aria-label="Player name"
        />
        <div className="flex items-center gap-1">
          {isMonarch ? <span className="rounded-full border border-white/20 px-2 py-1 text-xs text-zinc-200">M</span> : null}
          {isInitiative ? <span className="rounded-full border border-white/20 px-2 py-1 text-xs text-zinc-200">I</span> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-[color:var(--surface-border)] bg-white/[0.02] p-3">
        <p className="type-label">Life</p>
        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button type="button" className="nav-link px-3 py-3 text-lg" onClick={() => onAdjustLife(-1)}>
            -1
          </button>
          <p className="text-center text-4xl font-semibold tracking-tight text-zinc-100">{player.life}</p>
          <button type="button" className="nav-link nav-link-active px-3 py-3 text-lg" onClick={() => onAdjustLife(1)}>
            +1
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" className="nav-link px-3 py-2 text-sm" onClick={() => onAdjustLife(-5)}>
            -5
          </button>
          <button type="button" className="nav-link nav-link-active px-3 py-2 text-sm" onClick={() => onAdjustLife(5)}>
            +5
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatAdjuster label="Poison" value={player.poison} onDecrease={() => onAdjustPoison(-1)} onIncrease={() => onAdjustPoison(1)} />

        <div className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.02] px-3 py-2">
          <p className="type-label">Role State</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className={`nav-link ${isMonarch ? "nav-link-active" : ""}`} onClick={onToggleMonarch}>
              Monarch
            </button>
            <button type="button" className={`nav-link ${isInitiative ? "nav-link-active" : ""}`} onClick={onToggleInitiative}>
              Initiative
            </button>
          </div>
        </div>
      </div>

      {counterNames.length > 0 ? (
        <div className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.02] p-3">
          <p className="type-label">Custom Counters</p>
          <div className="mt-2 grid gap-2">
            {counterNames.map((name) => (
              <div key={`${player.id}-${name}`} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-2 py-2">
                <span className="text-sm text-zinc-200">{name}</span>
                <div className="flex items-center gap-2">
                  <button type="button" className="nav-link px-2 py-1.5" onClick={() => onAdjustCounter(name, -1)}>
                    -
                  </button>
                  <span className="w-7 text-center text-sm text-zinc-100">{player.customCounters[name] ?? 0}</span>
                  <button type="button" className="nav-link nav-link-active px-2 py-1.5" onClick={() => onAdjustCounter(name, 1)}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-[color:var(--surface-border)] bg-white/[0.02] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="type-label">Commander Damage</p>
          <p className="text-xs text-[color:var(--text-subtle)]">{maxCommanderDamage >= 21 ? "Lethal threshold reached" : `Max ${maxCommanderDamage}/21`}</p>
        </div>
        <div className="mt-2 space-y-2">
          {opponents.map((opponent) => {
            const value = player.commanderDamageTaken[opponent.id] ?? 0;

            return (
              <div key={`${player.id}-${opponent.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-2 py-2">
                <span className="text-sm text-zinc-200">{opponent.name}</span>
                <div className="flex items-center gap-2">
                  <button type="button" className="nav-link px-2 py-1.5" onClick={() => onAdjustCommanderDamage(opponent.id, -1)}>
                    -
                  </button>
                  <span className="w-8 text-center text-sm text-zinc-100">{value}</span>
                  <button type="button" className="nav-link nav-link-active px-2 py-1.5" onClick={() => onAdjustCommanderDamage(opponent.id, 1)}>
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export function LifeTrackerWorkspace() {
  const [state, dispatch] = useReducer(lifeTrackerReducer, undefined, createInitialTrackerState);
  const [counterName, setCounterName] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = parsePersistedTrackerState(JSON.parse(raw));
        if (parsed) {
          dispatch({ type: "hydrate", state: parsed });
        }
      }
    } catch {
      // ignore persistence errors
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeTrackerState(state)));
    } catch {
      // ignore persistence errors
    }
  }, [hydrated, state]);

  const allCounterNames = useMemo(() => {
    const names = new Set<string>();
    for (const player of state.present.players) {
      for (const name of Object.keys(player.customCounters)) {
        names.add(name);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [state.present.players]);

  const canUndo = state.past.length > 0;

  function onAddCustomCounter() {
    dispatch({ type: "add_custom_counter", name: counterName });
    setCounterName("");
  }

  function runNewGame() {
    if (window.confirm("Start a new game? This resets names and counters.")) {
      dispatch({ type: "new_game" });
    }
  }

  function runQuickReset() {
    if (window.confirm("Quick reset life and counters for current players?")) {
      dispatch({ type: "quick_reset" });
    }
  }

  return (
    <div className="space-y-5">
      <section className="surface-panel p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
          <label className="space-y-2">
            <span className="type-label">Players</span>
            <select
              value={state.present.playerCount}
              onChange={(event) => dispatch({ type: "set_player_count", count: Number(event.target.value) })}
              className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
            >
              {Array.from(
                { length: TRACKER_PLAYER_MAX - TRACKER_PLAYER_MIN + 1 },
                (_, index) => TRACKER_PLAYER_MIN + index,
              ).map((count) => (
                <option key={count} value={count} className="bg-zinc-900">
                  {count} Players
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="type-label">Starting Life</span>
            <select
              value={state.present.startingLife}
              onChange={(event) =>
                dispatch({
                  type: "set_starting_life",
                  life: Number(event.target.value) as (typeof COMMANDER_LIFE_PRESETS)[number],
                })
              }
              className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
            >
              {COMMANDER_LIFE_PRESETS.map((life) => (
                <option key={life} value={life} className="bg-zinc-900">
                  {life} Life
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="nav-link" onClick={() => dispatch({ type: "undo" })} disabled={!canUndo}>
            Undo
          </button>

          <div className="flex gap-2">
            <button type="button" className="nav-link" onClick={runQuickReset}>
              Quick Reset
            </button>
            <button type="button" className="nav-link nav-link-active" onClick={runNewGame}>
              New Game
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={counterName}
            onChange={(event) => setCounterName(event.target.value)}
            placeholder="Add custom counter (for all players)"
            className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
          />
          <button type="button" className="nav-link nav-link-active justify-center" onClick={onAddCustomCounter}>
            Add Counter
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.present.players.map((player) => {
          const opponents = state.present.players.filter((candidate) => candidate.id !== player.id);

          return (
            <PlayerPanel
              key={player.id}
              player={player}
              opponents={opponents}
              isMonarch={state.present.monarchPlayerId === player.id}
              isInitiative={state.present.initiativePlayerId === player.id}
              counterNames={allCounterNames}
              onNameChange={(name) => dispatch({ type: "set_player_name", playerId: player.id, name })}
              onAdjustLife={(delta) => dispatch({ type: "adjust_life", playerId: player.id, delta })}
              onAdjustPoison={(delta) => dispatch({ type: "adjust_poison", playerId: player.id, delta })}
              onToggleMonarch={() => dispatch({ type: "toggle_monarch", playerId: player.id })}
              onToggleInitiative={() => dispatch({ type: "toggle_initiative", playerId: player.id })}
              onAdjustCommanderDamage={(sourcePlayerId, delta) =>
                dispatch({
                  type: "adjust_commander_damage",
                  targetPlayerId: player.id,
                  sourcePlayerId,
                  delta,
                })
              }
              onAdjustCounter={(name, delta) =>
                dispatch({
                  type: "adjust_custom_counter",
                  playerId: player.id,
                  name,
                  delta,
                })
              }
            />
          );
        })}
      </section>
    </div>
  );
}
