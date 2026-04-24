"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Layers } from "lucide-react";
import { DeckCreatePanel } from "@/components/decks/deck-create-panel";
import { EmptyState } from "@/components/primitives";
import type { DeckRecord } from "@/modules/deck";

type DecksWorkspaceProps = {
  initialDecks: DeckRecord[];
};

export function insertDeckIntoList(current: DeckRecord[], deck: DeckRecord): DeckRecord[] {
  if (current.some((entry) => entry.id === deck.id)) {
    return current;
  }

  return [deck, ...current];
}

export function DecksWorkspace({ initialDecks }: DecksWorkspaceProps) {
  const [decks, setDecks] = useState(initialDecks);

  const sortedDecks = useMemo(
    () =>
      [...decks].sort((left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      ),
    [decks],
  );

  return (
    <div className="mt-10 space-y-5">
      <DeckCreatePanel
        onCreated={(deck) => {
          setDecks((current) => insertDeckIntoList(current, deck));
        }}
      />

      <section className="surface-panel p-5 sm:p-6">
        <p className="type-label">Your Decks</p>
        <div className="mt-3 space-y-2">
          {sortedDecks.length === 0 ? (
            <EmptyState
              icon={<Layers size={24} />}
              title="No decks yet"
              description="Create your first Commander deck to start building. You can source cards from your library or the full legal pool."
            />
          ) : (
            sortedDecks.map((deck) => (
              <article key={deck.id} className="surface-card interactive-lift p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{deck.name}</p>
                    <p className="text-xs text-[color:var(--text-subtle)]">
                      {deck.cards.reduce((sum, entry) => sum + entry.quantity, 0)} cards
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <a
                      href={`/api/decks/${deck.id}/playtest-pdf`}
                      className="nav-link"
                      download
                    >
                      <Download size={14} className="mr-1.5" />
                      Download Playtest PDF
                    </a>
                    <Link href={`/decks/${deck.id}`} className="nav-link nav-link-active">
                      Open
                    </Link>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
