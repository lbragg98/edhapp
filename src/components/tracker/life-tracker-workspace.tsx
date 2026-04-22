"use client";

import { useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  Crown,
  Flag,
  Image as ImageIcon,
  ImageOff,
  Loader2,
  Plus,
  Minus,
  Palette,
  Search,
  Settings,
  Skull,
  Swords,
  Undo2,
  RotateCcw,
  Users,
  X,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

const STORAGE_KEY = "command-tower.life-tracker.v1";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}

const PLAYER_THEME_OPTIONS = [
  { key: "graphite", label: "Graphite", tileClass: "bg-slate-800/95", swatchClass: "bg-slate-500" },
  { key: "ocean", label: "Ocean", tileClass: "bg-blue-950/95", swatchClass: "bg-blue-600" },
  { key: "forest", label: "Forest", tileClass: "bg-emerald-950/95", swatchClass: "bg-emerald-600" },
  { key: "crimson", label: "Crimson", tileClass: "bg-rose-950/95", swatchClass: "bg-rose-600" },
  { key: "violet", label: "Violet", tileClass: "bg-violet-950/95", swatchClass: "bg-violet-600" },
  { key: "gold", label: "Gold", tileClass: "bg-amber-900/95", swatchClass: "bg-amber-500" },
] as const;

type TrackerThemeOption = (typeof PLAYER_THEME_OPTIONS)[number];

type TrackerImageCandidate = {
  id: string;
  name: string;
  imageUri: string;
};

function resolveTheme(themeKey: string, fallbackIndex: number): TrackerThemeOption {
  return (
    PLAYER_THEME_OPTIONS.find((option) => option.key === themeKey) ??
    PLAYER_THEME_OPTIONS[fallbackIndex % PLAYER_THEME_OPTIONS.length] ??
    PLAYER_THEME_OPTIONS[0]
  );
}

function CounterChip({
  icon,
  value,
  title,
}: {
  icon: ReactNode;
  value: number;
  title: string;
}) {
  return (
    <div
      title={title}
      className="inline-flex min-w-12 items-center justify-center gap-1 rounded-full border border-white/15 bg-black/20 px-2 py-1 text-xs text-zinc-100"
    >
      <span className="text-zinc-300">{icon}</span>
      <span>{value}</span>
    </div>
  );
}

function PlayerSettingsPanel({
  player,
  styleIndex,
  opponents,
  isMonarch,
  isInitiative,
  counterNames,
  onClose,
  onNameChange,
  onAdjustPoison,
  onToggleMonarch,
  onToggleInitiative,
  onAdjustCommanderDamage,
  onAdjustCounter,
  onThemeChange,
  onBackgroundImageChange,
}: {
  player: TrackerPlayer;
  styleIndex: number;
  opponents: TrackerPlayer[];
  isMonarch: boolean;
  isInitiative: boolean;
  counterNames: string[];
  onClose: () => void;
  onNameChange: (name: string) => void;
  onAdjustPoison: (delta: number) => void;
  onToggleMonarch: () => void;
  onToggleInitiative: () => void;
  onAdjustCommanderDamage: (sourcePlayerId: string, delta: number) => void;
  onAdjustCounter: (name: string, delta: number) => void;
  onThemeChange: (themeKey: string) => void;
  onBackgroundImageChange: (imageUri: string | null, cardName: string | null) => void;
}) {
  const [imageQuery, setImageQuery] = useState("");
  const [imageCandidates, setImageCandidates] = useState<TrackerImageCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedImageQuery = useDebouncedValue(imageQuery, 220);
  const activeTheme = resolveTheme(player.themeKey, styleIndex);
  const visibleImageCandidates = debouncedImageQuery.trim().length < 2 ? [] : imageCandidates;

  useEffect(() => {
    if (!debouncedImageQuery || debouncedImageQuery.trim().length < 2) {
      return;
    }

    const controller = new AbortController();

    async function searchImages() {
      setIsSearching(true);
      const params = new URLSearchParams({
        query: debouncedImageQuery.trim(),
        pool: "all",
        commanderOnly: "false",
        sort: "relevance",
        pageSize: "8",
      });

      const response = await fetch(`/api/cards?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        setImageCandidates([]);
        setIsSearching(false);
        return;
      }

      const payload = (await response.json()) as {
        data?: {
          items?: Array<{ id?: string; name?: string; imageUri?: string | null }>;
        };
      };

      const mapped = (payload.data?.items ?? [])
        .filter(
          (item): item is { id: string; name: string; imageUri: string } =>
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            typeof item.imageUri === "string" &&
            item.imageUri.length > 0,
        )
        .map((item) => ({
          id: item.id,
          name: item.name,
          imageUri: item.imageUri,
        }));

      setImageCandidates(mapped);
      setIsSearching(false);
    }

    searchImages().catch(() => {
      setImageCandidates([]);
      setIsSearching(false);
    });

    return () => controller.abort();
  }, [debouncedImageQuery]);

  return (
    <div className="absolute inset-0 z-10 rounded-2xl border border-white/20 bg-black/80 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="type-label">Player Settings</p>
        <button type="button" className="nav-link p-2" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      <div className="mt-3 space-y-3 overflow-y-auto pb-2">
        <label className="block space-y-1">
          <span className="type-label">Name</span>
          <input
            value={player.name}
            onChange={(event) => onNameChange(event.target.value)}
            className="w-full rounded-lg border border-white/15 bg-black/25 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-white/30"
          />
        </label>

        <div className="rounded-lg border border-white/15 bg-black/25 p-2.5">
          <div className="flex items-center gap-1.5">
            <Palette size={12} className="text-zinc-300" />
            <p className="type-label">Appearance</p>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {PLAYER_THEME_OPTIONS.map((theme) => (
              <button
                key={theme.key}
                type="button"
                title={theme.label}
                onClick={() => onThemeChange(theme.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition",
                  theme.key === activeTheme.key
                    ? "border-white/45 bg-white/10 text-zinc-50"
                    : "border-white/15 bg-black/20 text-zinc-200 hover:border-white/30",
                )}
              >
                <span className={cn("h-3 w-3 rounded-full border border-white/30", theme.swatchClass)} />
                {theme.label}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            <label className="block space-y-1">
              <span className="type-label">Background Card Art</span>
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-2.5 text-zinc-400" />
                <input
                  value={imageQuery}
                  onChange={(event) => {
                    const next = event.target.value;
                    setImageQuery(next);
                    if (next.trim().length < 2) {
                      setImageCandidates([]);
                      setIsSearching(false);
                    }
                  }}
                  placeholder="Search card art..."
                  className="w-full rounded-lg border border-white/15 bg-black/25 py-2 pl-8 pr-2.5 text-xs text-zinc-100 outline-none focus:border-white/30"
                />
              </div>
            </label>

            {player.backgroundImageUri ? (
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-xs text-zinc-200">
                <div className="inline-flex items-center gap-1.5 truncate">
                  <ImageIcon size={12} className="text-zinc-300" />
                  <span className="truncate">{player.backgroundImageCardName ?? "Selected image"}</span>
                </div>
                <button
                  type="button"
                  className="nav-link px-2 py-1"
                  onClick={() => onBackgroundImageChange(null, null)}
                >
                  <ImageOff size={12} className="mr-1" />
                  Clear
                </button>
              </div>
            ) : null}

            {isSearching ? (
              <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                <Loader2 size={12} className="animate-spin" />
                Searching Scryfall...
              </div>
            ) : null}

            {visibleImageCandidates.length > 0 ? (
              <div className="grid grid-cols-4 gap-1.5">
                {visibleImageCandidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    title={candidate.name}
                    onClick={() => onBackgroundImageChange(candidate.imageUri, candidate.name)}
                    className="group relative overflow-hidden rounded-md border border-white/20"
                  >
                    <Image
                      src={candidate.imageUri}
                      alt={candidate.name}
                      width={160}
                      height={224}
                      unoptimized
                      className="h-16 w-full object-cover transition duration-200 group-hover:scale-105"
                    />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1 py-0.5 text-[10px] text-zinc-100">
                      {candidate.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-white/15 bg-black/25 p-2.5">
          <p className="type-label">Status</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={cn("nav-link", isMonarch && "nav-link-active")} onClick={onToggleMonarch}>
              <Crown size={13} className="mr-1" /> Monarch
            </button>
            <button type="button" className={cn("nav-link", isInitiative && "nav-link-active")} onClick={onToggleInitiative}>
              <Flag size={13} className="mr-1" /> Initiative
            </button>
            <button type="button" className="nav-link" onClick={() => onAdjustPoison(-1)}>
              - Poison
            </button>
            <button type="button" className="nav-link nav-link-active" onClick={() => onAdjustPoison(1)}>
              + Poison
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-white/15 bg-black/25 p-2.5">
          <p className="type-label">Commander Damage</p>
          <div className="mt-2 space-y-2">
            {opponents.map((opponent) => {
              const value = player.commanderDamageTaken[opponent.id] ?? 0;

              return (
                <div key={`${player.id}-${opponent.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-2 py-1.5">
                  <span className="text-xs text-zinc-200">{opponent.name}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" className="nav-link px-2 py-1" onClick={() => onAdjustCommanderDamage(opponent.id, -1)}>
                      -
                    </button>
                    <span className="w-6 text-center text-xs text-zinc-100">{value}</span>
                    <button type="button" className="nav-link nav-link-active px-2 py-1" onClick={() => onAdjustCommanderDamage(opponent.id, 1)}>
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {counterNames.length > 0 ? (
          <div className="rounded-lg border border-white/15 bg-black/25 p-2.5">
            <p className="type-label">Custom Counters</p>
            <div className="mt-2 space-y-2">
              {counterNames.map((counter) => {
                const value = player.customCounters[counter] ?? 0;
                return (
                  <div key={`${player.id}-${counter}`} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-2 py-1.5">
                    <span className="text-xs text-zinc-200">{counter}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" className="nav-link px-2 py-1" onClick={() => onAdjustCounter(counter, -1)}>
                        -
                      </button>
                      <span className="w-6 text-center text-xs text-zinc-100">{value}</span>
                      <button type="button" className="nav-link nav-link-active px-2 py-1" onClick={() => onAdjustCounter(counter, 1)}>
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PlayerTile({
  player,
  opponents,
  styleIndex,
  isMonarch,
  isInitiative,
  counterNames,
  onAdjustLife,
  onAdjustPoison,
  onToggleMonarch,
  onToggleInitiative,
  onAdjustCommanderDamage,
  onAdjustCounter,
  onNameChange,
  onThemeChange,
  onBackgroundImageChange,
}: {
  player: TrackerPlayer;
  opponents: TrackerPlayer[];
  styleIndex: number;
  isMonarch: boolean;
  isInitiative: boolean;
  counterNames: string[];
  onAdjustLife: (delta: number) => void;
  onAdjustPoison: (delta: number) => void;
  onToggleMonarch: () => void;
  onToggleInitiative: () => void;
  onAdjustCommanderDamage: (sourcePlayerId: string, delta: number) => void;
  onAdjustCounter: (name: string, delta: number) => void;
  onNameChange: (name: string) => void;
  onThemeChange: (themeKey: string) => void;
  onBackgroundImageChange: (imageUri: string | null, cardName: string | null) => void;
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const maxCommanderDamage = Math.max(0, ...Object.values(player.commanderDamageTaken));
  const theme = resolveTheme(player.themeKey, styleIndex);

  return (
    <article
      className={cn(
        "relative isolate min-h-[230px] overflow-hidden rounded-2xl border border-white/15 p-3 text-zinc-100",
        theme.tileClass,
      )}
    >
      {player.backgroundImageUri ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-60"
            style={{ backgroundImage: `url("${player.backgroundImageUri}")` }}
          />
          <div className="pointer-events-none absolute inset-0 z-0 bg-black/45" />
        </>
      ) : null}

      <div className="relative z-[1]">
        <div className="flex items-center justify-between">
          <p className="text-sm tracking-wide text-zinc-200">{player.name}</p>
          <button type="button" className="nav-link p-2" onClick={() => setIsSettingsOpen((current) => !current)}>
            <Settings size={14} />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onAdjustLife(-1)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-black/20 text-zinc-100 transition hover:bg-black/35"
          >
            <Minus size={22} />
          </button>

          <div className="text-center">
            <p className="text-7xl font-semibold leading-none tracking-tight">{player.life}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              <CounterChip icon={<Skull size={11} />} value={player.poison} title="Poison" />
              <CounterChip icon={<Swords size={11} />} value={maxCommanderDamage} title="Max commander damage" />
              <CounterChip icon={<Crown size={11} />} value={isMonarch ? 1 : 0} title="Monarch" />
              <CounterChip icon={<Flag size={11} />} value={isInitiative ? 1 : 0} title="Initiative" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAdjustLife(1)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-black/20 text-zinc-100 transition hover:bg-black/35"
          >
            <Plus size={22} />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <button type="button" className="nav-link px-2.5 py-1.5" onClick={() => onAdjustLife(-5)}>
            -5
          </button>
          <button type="button" className="nav-link nav-link-active px-2.5 py-1.5" onClick={() => onAdjustLife(5)}>
            +5
          </button>
        </div>
      </div>

      {isSettingsOpen ? (
        <PlayerSettingsPanel
          player={player}
          styleIndex={styleIndex}
          opponents={opponents}
          isMonarch={isMonarch}
          isInitiative={isInitiative}
          counterNames={counterNames}
          onClose={() => setIsSettingsOpen(false)}
          onNameChange={onNameChange}
          onAdjustPoison={onAdjustPoison}
          onToggleMonarch={onToggleMonarch}
          onToggleInitiative={onToggleInitiative}
          onAdjustCommanderDamage={onAdjustCommanderDamage}
          onAdjustCounter={onAdjustCounter}
          onThemeChange={onThemeChange}
          onBackgroundImageChange={onBackgroundImageChange}
        />
      ) : null}
    </article>
  );
}

function GlobalSettingsSheet({
  isOpen,
  playerCount,
  startingLife,
  canUndo,
  counterName,
  onClose,
  onPlayerCountChange,
  onStartingLifeChange,
  onUndo,
  onQuickReset,
  onNewGame,
  onCounterNameChange,
  onAddCounter,
}: {
  isOpen: boolean;
  playerCount: number;
  startingLife: number;
  canUndo: boolean;
  counterName: string;
  onClose: () => void;
  onPlayerCountChange: (count: number) => void;
  onStartingLifeChange: (life: 40 | 30 | 20) => void;
  onUndo: () => void;
  onQuickReset: () => void;
  onNewGame: () => void;
  onCounterNameChange: (value: string) => void;
  onAddCounter: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/55 p-3 sm:items-center">
      <section className="surface-panel w-full max-w-xl rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-100">Tracker Settings</p>
          <button type="button" className="nav-link p-2" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="type-label">Players</span>
            <select
              value={playerCount}
              onChange={(event) => onPlayerCountChange(Number(event.target.value))}
              className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[color:var(--surface-border-strong)]"
            >
              {Array.from({ length: TRACKER_PLAYER_MAX - TRACKER_PLAYER_MIN + 1 }, (_, index) => TRACKER_PLAYER_MIN + index).map((count) => (
                <option key={count} value={count} className="bg-zinc-900">
                  {count} Players
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="type-label">Starting Life</span>
            <select
              value={startingLife}
              onChange={(event) => onStartingLifeChange(Number(event.target.value) as 40 | 30 | 20)}
              className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[color:var(--surface-border-strong)]"
            >
              {COMMANDER_LIFE_PRESETS.map((life) => (
                <option key={life} value={life} className="bg-zinc-900">
                  {life} Life
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={counterName}
            onChange={(event) => onCounterNameChange(event.target.value)}
            placeholder="Add shared counter"
            className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-[color:var(--surface-border-strong)]"
          />
          <button type="button" className="nav-link nav-link-active" onClick={onAddCounter}>
            Add Counter
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="nav-link" onClick={onUndo} disabled={!canUndo}>
            <Undo2 size={14} className="mr-1.5" /> Undo
          </button>
          <button type="button" className="nav-link" onClick={onQuickReset}>
            <RotateCcw size={14} className="mr-1.5" /> Reset Counters
          </button>
          <button type="button" className="nav-link nav-link-active" onClick={onNewGame}>
            <Users size={14} className="mr-1.5" /> New Game
          </button>
        </div>
      </section>
    </div>
  );
}

export function LifeTrackerWorkspace() {
  const [state, dispatch] = useReducer(lifeTrackerReducer, undefined, createInitialTrackerState);
  const [counterName, setCounterName] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    dispatch({ type: "new_game" });
    setIsSettingsOpen(false);
  }

  function runQuickReset() {
    dispatch({ type: "quick_reset" });
    setIsSettingsOpen(false);
  }

  const columnClass = state.present.playerCount <= 2
    ? "grid-cols-1"
    : state.present.playerCount <= 4
      ? "grid-cols-2"
      : "grid-cols-2";

  return (
    <div className="relative space-y-4 pb-20">
      <section className={cn("grid gap-3", columnClass)}>
        {state.present.players.map((player, index) => {
          const opponents = state.present.players.filter((candidate) => candidate.id !== player.id);

          return (
            <PlayerTile
              key={player.id}
              player={player}
              opponents={opponents}
              styleIndex={index}
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
              onThemeChange={(themeKey) =>
                dispatch({
                  type: "set_player_theme",
                  playerId: player.id,
                  themeKey,
                })
              }
              onBackgroundImageChange={(imageUri, cardName) =>
                dispatch({
                  type: "set_player_background_image",
                  playerId: player.id,
                  imageUri,
                  cardName,
                })
              }
            />
          );
        })}
      </section>

      <button
        type="button"
        className="fixed bottom-5 left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/75 px-4 py-3 text-sm text-zinc-100 shadow-xl backdrop-blur-sm transition hover:bg-black/85"
        onClick={() => setIsSettingsOpen(true)}
      >
        <Settings size={16} /> Settings
      </button>

      <GlobalSettingsSheet
        isOpen={isSettingsOpen}
        playerCount={state.present.playerCount}
        startingLife={state.present.startingLife}
        canUndo={canUndo}
        counterName={counterName}
        onClose={() => setIsSettingsOpen(false)}
        onPlayerCountChange={(count) => dispatch({ type: "set_player_count", count })}
        onStartingLifeChange={(life) => dispatch({ type: "set_starting_life", life })}
        onUndo={() => dispatch({ type: "undo" })}
        onQuickReset={runQuickReset}
        onNewGame={runNewGame}
        onCounterNameChange={setCounterName}
        onAddCounter={onAddCustomCounter}
      />
    </div>
  );
}
