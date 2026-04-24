import { SectionHeading } from "@/components/layout";
import { DecksWorkspace } from "@/components/decks";
import { createDeckService } from "@/modules/deck";
import { getProtectedPageAppUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const appUser = await getProtectedPageAppUser();
  const service = createDeckService(appUser.appUserId);
  const decks = service ? await service.list() : [];

  return (
    <>
      <SectionHeading
        eyebrow="Deckbuilder"
        title="Build Commander decks from one switchable source system."
        description="Source mode can swap between your library and the full legal pool without changing the editor interaction model."
      />

      <DecksWorkspace initialDecks={decks} />
    </>
  );
}
