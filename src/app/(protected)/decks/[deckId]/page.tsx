import Link from "next/link";
import { redirect } from "next/navigation";
import { DeckEditorWorkspace } from "@/components/decks";
import { createDeckService } from "@/modules/deck";
import { getProtectedPageAppUser } from "@/server/auth";

export const dynamic = "force-dynamic";

type DeckEditorPageProps = {
  params: Promise<{ deckId: string }>;
};

export default async function DeckEditorPage({ params }: DeckEditorPageProps) {
  const { deckId } = await params;
  const appUser = await getProtectedPageAppUser();
  const service = createDeckService(appUser.appUserId);

  if (!service) {
    redirect("/decks?error=service_unavailable");
  }

  const payload = await service.getById(deckId);

  if (!payload) {
    redirect("/decks?error=deck_not_found");
  }

  return (
    <>
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
    </>
  );
}
