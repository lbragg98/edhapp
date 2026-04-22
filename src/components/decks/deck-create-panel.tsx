"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CreateDeckResponse = {
  data: {
    deck: {
      id: string;
    };
  };
};

export function DeckCreatePanel() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function createDeck() {
    if (!name.trim()) {
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        sourceMode: "all",
      }),
    });

    if (!response.ok) {
      setIsSubmitting(false);
      return;
    }

    const payload = (await response.json()) as CreateDeckResponse;

    router.push(`/decks/${payload.data.deck.id}`);
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
    </section>
  );
}
