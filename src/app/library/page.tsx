import { AppShell, SectionHeading } from "@/components/layout";
import { LibraryWorkspace } from "@/components/library";
import { createListLibraryCardsService } from "@/modules/library";
import { requirePageAppUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const appUser = await requirePageAppUser("/library");
  const service = createListLibraryCardsService(appUser.appUserId);
  const records = await service.execute({ pageSize: 24 });

  return (
    <AppShell>
      <SectionHeading
        eyebrow="Collection"
        title="Your personal card library."
        description="Canonical card identity, print identity, and owned quantities are tracked separately for future deckbuilding, scanner imports, and valuation features."
      />

      <div className="mt-10">
        <LibraryWorkspace initialRecords={records} />
      </div>
    </AppShell>
  );
}
