"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DeckRecord } from "@/modules/deck";
import { parseDeckWorkspaceResponse } from "@/modules/deck";

type DeckCreatePanelProps = {
  onCreated?: (deck: DeckRecord) => void;
};

export function DeckCreatePanel({ onCreated }: DeckCreatePanelProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createDeck() {
    if (!name.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sourceMode: "all",
        }),
      });

      const rawPayload = await response.json().catch(() => null);

      if (!response.ok) {
        const payload = rawPayload as { error?: string } | null;
        if (payload && typeof payload.error === "string" && payload.error.length > 0) {
          setError(payload.error);
        } else {
          setError("Failed to create deck.");
        }
        return;
      }

      const payload = parseDeckWorkspaceResponse(rawPayload, "deck_create_panel");
      if (!payload) {
        setError("Deck created but response was invalid. Please refresh.");
        return;
      }

      setName("");
      onCreated?.(payload.deck);
      router.push(`/decks/${payload.deck.id}`);
    } catch {
      setError("Failed to create deck.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="surface-panel p-5 sm:p-6">
      <p className="type-label">Create Deck</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter deck name"
          className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[color:var(--surface-border-strong)] focus:outline-none"
        />
        <button
          type="button"
          onClick={createDeck}
          className="nav-link nav-link-active justify-center"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create"}
        </button>
      </div>
      {error ? (
        <p className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
    </section>
  );
}
