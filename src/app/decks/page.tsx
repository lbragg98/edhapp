import Link from "next/link";
import { Layers } from "lucide-react";
import { AppShell, SectionHeading } from "@/components/layout";
import { DeckCreatePanel } from "@/components/decks";
import { EmptyState } from "@/components/primitives";
import { createDeckService } from "@/modules/deck";
import { requirePageAppUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const appUser = await requirePageAppUser("/decks");
  const service = createDeckService(appUser.appUserId);
  const decks = service ? await service.list() : [];

  return (
    <AppShell>
      <SectionHeading
        eyebrow="Deckbuilder"
        title="Build Commander decks from one switchable source system."
        description="Source mode can swap between your library and the full legal pool without changing the editor interaction model."
      />

      <div className="mt-10 space-y-5">
        <DeckCreatePanel />

        <section className="surface-panel p-5 sm:p-6">
          <p className="type-label">Your Decks</p>
          <div className="mt-3 space-y-2">
            {decks.length === 0 ? (
              <EmptyState
                icon={<Layers size={24} />}
                title="No decks yet"
                description="Create your first Commander deck to start building. You can source cards from your library or the full legal pool."
              />
            ) : (
              decks.map((deck) => (
                <Link
                  key={deck.id}
                  href={`/decks/${deck.id}`}
                  className="surface-card interactive-lift flex items-center justify-between p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{deck.name}</p>
                    <p className="text-xs text-[color:var(--text-subtle)]">
                      {deck.cards.reduce((sum, entry) => sum + entry.quantity, 0)} cards
                    </p>
                  </div>
                  <span className="nav-link nav-link-active">Open</span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
