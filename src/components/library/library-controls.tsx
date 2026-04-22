"use client";

import { cn } from "@/lib/utils";
import { COLLECTION_CONDITIONS, COLLECTION_FINISHES, type CollectionCondition, type CollectionFinish } from "@/modules/library";

type LibraryControlsProps = {
  query: string;
  finish: CollectionFinish | "ALL";
  condition: CollectionCondition | "ALL";
  onQueryChange: (value: string) => void;
  onFinishChange: (value: CollectionFinish | "ALL") => void;
  onConditionChange: (value: CollectionCondition | "ALL") => void;
};

export function LibraryControls({
  query,
  finish,
  condition,
  onQueryChange,
  onFinishChange,
  onConditionChange,
}: LibraryControlsProps) {
  return (
    <section className="surface-panel grid gap-3 p-5 sm:grid-cols-[1fr_auto_auto] sm:p-6">
      <label className="space-y-2">
        <span className="type-label">Library Search</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search owned cards"
          className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
        />
      </label>

      <label className="space-y-2 sm:min-w-40">
        <span className="type-label">Finish</span>
        <select
          value={finish}
          onChange={(event) => onFinishChange(event.target.value as CollectionFinish | "ALL")}
          className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
        >
          <option value="ALL">All Finishes</option>
          {COLLECTION_FINISHES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 sm:min-w-40">
        <span className="type-label">Condition</span>
        <select
          value={condition}
          onChange={(event) => onConditionChange(event.target.value as CollectionCondition | "ALL")}
          className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
        >
          <option value="ALL">All Conditions</option>
          {COLLECTION_CONDITIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

type AddControlsProps = {
  addQuery: string;
  quantity: number;
  finish: CollectionFinish;
  condition: CollectionCondition;
  note: string;
  isSubmitting: boolean;
  onAddQueryChange: (value: string) => void;
  onQuantityChange: (value: number) => void;
  onFinishChange: (value: CollectionFinish) => void;
  onConditionChange: (value: CollectionCondition) => void;
  onNoteChange: (value: string) => void;
};

export function AddToLibraryControls({
  addQuery,
  quantity,
  finish,
  condition,
  note,
  isSubmitting,
  onAddQueryChange,
  onQuantityChange,
  onFinishChange,
  onConditionChange,
  onNoteChange,
}: AddControlsProps) {
  return (
    <section className={cn("surface-panel space-y-3 p-5 sm:p-6", isSubmitting && "opacity-70")}> 
      <div className="grid gap-3 sm:grid-cols-[1fr_90px_120px_120px]">
        <label className="space-y-2">
          <span className="type-label">Find Card To Add</span>
          <input
            value={addQuery}
            onChange={(event) => onAddQueryChange(event.target.value)}
            placeholder="Search all cards"
            className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
          />
        </label>

        <label className="space-y-2">
          <span className="type-label">Qty</span>
          <input
            type="number"
            min={1}
            max={250}
            value={quantity}
            onChange={(event) => onQuantityChange(Math.max(1, Number(event.target.value) || 1))}
            className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
          />
        </label>

        <label className="space-y-2">
          <span className="type-label">Finish</span>
          <select
            value={finish}
            onChange={(event) => onFinishChange(event.target.value as CollectionFinish)}
            className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
          >
            {COLLECTION_FINISHES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="type-label">Condition</span>
          <select
            value={condition}
            onChange={(event) => onConditionChange(event.target.value as CollectionCondition)}
            className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-100 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
          >
            {COLLECTION_CONDITIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-2">
        <span className="type-label">Optional Note</span>
        <input
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Binder page, signed copy, acquisition context"
          className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
        />
      </label>
    </section>
  );
}
