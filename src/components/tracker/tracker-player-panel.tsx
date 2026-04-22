"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import {
  Crown,
  Flag,
  Image as ImageIcon,
  ImageOff,
  Loader2,
  Minus,
  Palette,
  Plus,
  Search,
  Settings,
  Skull,
  Swords,
  X,
} from "lucide-react";
import type { TrackerPlayer } from "@/modules/tracker";
import { cn } from "@/lib/utils";
import { resolveTrackerTheme, TRACKER_PLAYER_THEMES } from "@/components/tracker/tracker-player-theme";

type TrackerImageCandidate = {
  id: string;
  name: string;
  imageUri: string;
};

type TrackerPlayerPanelProps = {
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
};

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}

function CounterChip({ icon, value, title }: { icon: ReactNode; value: number; title: string }) {
  return (
    <div
      title={title}
      className="inline-flex min-w-12 items-center justify-center gap-1 rounded-full border border-white/15 bg-black/25 px-2 py-1 text-xs text-zinc-100"
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
  const activeTheme = resolveTrackerTheme(player.themeKey, styleIndex);
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
    <div className="absolute inset-0 z-10 rounded-2xl border border-white/20 bg-black/82 backdrop-blur-sm">
      <div
        className="h-full overflow-y-auto p-3"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)",
        }}
      >
        <div className="flex items-center justify-between">
          <p className="type-label">Player Settings</p>
          <button type="button" className="nav-link p-2" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="mt-3 space-y-3">
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
              {TRACKER_PLAYER_THEMES.map((theme) => (
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
                <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-xs text-zinc-200">
                  <div className="inline-flex min-w-0 items-center gap-1.5">
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
    </div>
  );
}

export function TrackerPlayerPanel({
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
}: TrackerPlayerPanelProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const maxCommanderDamage = Math.max(0, ...Object.values(player.commanderDamageTaken));
  const theme = resolveTrackerTheme(player.themeKey, styleIndex);

  return (
    <article
      className={cn(
        "relative isolate min-h-[190px] overflow-hidden rounded-2xl border border-white/15 px-3 py-2 text-zinc-100 sm:min-h-[220px]",
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
          <p className="text-sm tracking-wide text-zinc-100/90">{player.name}</p>
          <button type="button" className="nav-link p-2" onClick={() => setIsSettingsOpen((current) => !current)}>
            <Settings size={14} />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 sm:mt-3 sm:gap-3">
          <button
            type="button"
            onClick={() => onAdjustLife(-1)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-black/25 text-zinc-100 transition hover:bg-black/35 sm:h-14 sm:w-14"
          >
            <Minus size={24} />
          </button>

          <div className="text-center">
            <p className="text-6xl font-semibold leading-none tracking-tight sm:text-7xl">{player.life}</p>
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
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-black/25 text-zinc-100 transition hover:bg-black/35 sm:h-14 sm:w-14"
          >
            <Plus size={24} />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-center gap-2 sm:mt-3">
          <button type="button" className="nav-link px-2.5 py-2" onClick={() => onAdjustLife(-5)}>
            -5
          </button>
          <button type="button" className="nav-link nav-link-active px-2.5 py-2" onClick={() => onAdjustLife(5)}>
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