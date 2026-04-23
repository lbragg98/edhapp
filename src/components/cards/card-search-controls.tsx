"use client";

import { cn } from "@/lib/utils";

type CardSearchControlsProps = {
  query: string;
  typeLine: string;
  commanderOnly: boolean;
  sort: "relevance" | "name" | "released";
  pool: "all" | "library";
  colors: string[];
  onQueryChange: (value: string) => void;
  onTypeLineChange: (value: string) => void;
  onCommanderOnlyChange: (value: boolean) => void;
  onSortChange: (value: "relevance" | "name" | "released") => void;
  onPoolChange: (value: "all" | "library") => void;
  onToggleColor: (value: string) => void;
};

const colors = ["W", "U", "B", "R", "G"] as const;

export function CardSearchControls({
  query,
  typeLine,
  commanderOnly,
  sort,
  pool,
  colors: activeColors,
  onQueryChange,
  onTypeLineChange,
  onCommanderOnlyChange,
  onSortChange,
  onPoolChange,
  onToggleColor,
}: CardSearchControlsProps) {
  return (
    <section className="surface-panel space-y-4 p-5 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="space-y-2">
          <span className="type-label">Card Search</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            maxLength={240}
            placeholder="Search name, text, or mechanic"
            className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
          />
        </label>

        <label className="space-y-2 sm:min-w-44">
          <span className="type-label">Pool</span>
          <select
            value={pool}
            onChange={(event) => onPoolChange(event.target.value as "all" | "library")}
            className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
          >
            <option value="all">All Cards</option>
            <option value="library">My Library</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-2 sm:col-span-1">
          <span className="type-label">Type Filter</span>
          <input
            value={typeLine}
            onChange={(event) => onTypeLineChange(event.target.value)}
            maxLength={120}
            placeholder="Creature, Instant..."
            className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
          />
        </label>

        <label className="space-y-2 sm:col-span-1">
          <span className="type-label">Sort</span>
          <select
            value={sort}
            onChange={(event) =>
              onSortChange(event.target.value as "relevance" | "name" | "released")
            }
            className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
          >
            <option value="relevance">Relevance</option>
            <option value="name">Name</option>
            <option value="released">Released</option>
          </select>
        </label>

        <label className="flex items-end">
          <button
            type="button"
            className={cn(
              "w-full rounded-xl border px-3 py-2.5 text-sm transition-colors",
              commanderOnly
                ? "border-white/25 bg-white/[0.06] text-zinc-100"
                : "border-[color:var(--surface-border)] bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-zinc-200",
            )}
            onClick={() => onCommanderOnlyChange(!commanderOnly)}
          >
            Commander-Legal Only
          </button>
        </label>
      </div>

      <div className="space-y-2">
        <p className="type-label">Color Identity</p>
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => {
            const active = activeColors.includes(color);

            return (
              <button
                key={color}
                type="button"
                onClick={() => onToggleColor(color)}
                className={cn(
                  "inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-3 text-xs font-semibold transition-colors",
                  active
                    ? "border-white/30 bg-white/[0.08] text-zinc-100"
                    : "border-[color:var(--surface-border)] bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-zinc-200",
                )}
              >
                {color}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
