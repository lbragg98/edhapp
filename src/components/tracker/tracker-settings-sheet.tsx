"use client";

import { RotateCcw, Settings, Undo2, Users, X } from "lucide-react";
import { COMMANDER_LIFE_PRESETS, TRACKER_PLAYER_MAX, TRACKER_PLAYER_MIN } from "@/modules/tracker";

type TrackerSettingsSheetProps = {
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
};

export function TrackerSettingsSheet({
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
}: TrackerSettingsSheetProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-2 sm:items-center sm:p-3">
      <section className="surface-panel flex h-[calc(100dvh-0.5rem)] w-full max-w-2xl flex-col rounded-2xl sm:h-auto sm:max-h-[92dvh]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="inline-flex items-center gap-2">
            <Settings size={15} className="text-zinc-300" />
            <p className="text-sm font-medium text-zinc-100">Tracker Settings</p>
          </div>
          <button type="button" className="nav-link p-2" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div
          className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5"
          style={{
            paddingBottom: "max(env(safe-area-inset-bottom), 1rem)",
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="type-label">Players</span>
              <select
                value={playerCount}
                onChange={(event) => onPlayerCountChange(Number(event.target.value))}
                className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-3 text-sm text-zinc-100 outline-none focus:border-[color:var(--surface-border-strong)]"
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
                className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-3 text-sm text-zinc-100 outline-none focus:border-[color:var(--surface-border-strong)]"
              >
                {COMMANDER_LIFE_PRESETS.map((life) => (
                  <option key={life} value={life} className="bg-zinc-900">
                    {life} Life
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <span className="type-label">Shared Counters</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={counterName}
                onChange={(event) => onCounterNameChange(event.target.value)}
                placeholder="Add shared counter"
                className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-[color:var(--surface-border-strong)]"
              />
              <button type="button" className="nav-link nav-link-active justify-center px-4 py-3" onClick={onAddCounter}>
                Add Counter
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="type-label">Session</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button type="button" className="nav-link justify-center py-3" onClick={onUndo} disabled={!canUndo}>
                <Undo2 size={14} className="mr-1.5" /> Undo
              </button>
              <button type="button" className="nav-link justify-center py-3" onClick={onQuickReset}>
                <RotateCcw size={14} className="mr-1.5" /> Reset Counters
              </button>
              <button type="button" className="nav-link nav-link-active justify-center py-3" onClick={onNewGame}>
                <Users size={14} className="mr-1.5" /> New Game
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}