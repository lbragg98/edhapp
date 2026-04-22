import Link from "next/link";
import { notFound } from "next/navigation";
import { DeckEditorWorkspace } from "@/components/decks";
import { AppShell } from "@/components/layout";
import { createDeckService } from "@/modules/deck";
import { requirePageAppUser } from "@/server/auth";

export const dynamic = "force-dynamic";

type DeckEditorPageProps = {
  params: Promise<{ deckId: string }>;
};

export default async function DeckEditorPage({ params }: DeckEditorPageProps) {
  const { deckId } = await params;
  const appUser = await requirePageAppUser(`/decks/${deckId}`);
  const service = createDeckService(appUser.appUserId);

  if (!service) {
    notFound();
  }

  const payload = await service.getById(deckId);

  if (!payload) {
    notFound();
  }

  return (
    <AppShell>
      <div className="mb-5">
        <Link href="/decks" className="nav-link w-fit">
          Back to Decks
        </Link>
      </div>

      <DeckEditorWorkspace
        initialDeck={payload.deck}
        initialValidation={payload.validation}
        initialAnalytics={payload.analytics}
        initialIntelligence={payload.intelligence}
      />
    </AppShell>
  );
}
