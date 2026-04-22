import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CardIntelligenceWorkspace,
} from "@/components/cards";
import { StalenessIndicator } from "@/components/cards/staleness-indicator";
import { AppShell } from "@/components/layout";
import { createGetCardDetailService } from "@/modules/catalog";
import { requirePageAppUser } from "@/server/auth";
import {
  enqueueRefreshJobs,
  getRefreshStatus,
} from "@/server/jobs/actions/enqueue-refresh-jobs";

export const dynamic = "force-dynamic";

type CardDetailPageProps = {
  params: Promise<{ cardId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parsePool(value: string | string[] | undefined): "all" | "library" {
  return value === "library" ? "library" : "all";
}

export default async function CardDetailPage({ params, searchParams }: CardDetailPageProps) {
  const { cardId } = await params;
  const query = await searchParams;
  const pool = parsePool(query.pool);
  const appUser = pool === "library" ? await requirePageAppUser(`/cards/${cardId}?pool=library`) : null;

  const service = createGetCardDetailService(appUser?.appUserId);
  const card = await service.execute({ cardId, pool });

  if (!card) {
    if (pool === "library") {
      redirect("/cards?pool=library&error=card_not_in_library");
    }
    notFound();
  }

  // Enqueue refresh jobs if data is stale (fire and forget)
  const printingIds = card.printings.map((p) => p.id);
  enqueueRefreshJobs(cardId, printingIds).catch((err) =>
    console.error("[CardDetail] Failed to enqueue refresh jobs:", err),
  );

  // Check staleness for UI indicator
  const refreshStatus = await getRefreshStatus(cardId, printingIds);

  return (
    <AppShell>
      <div className="mb-5 space-y-3">
        <Link href={`/cards?pool=${pool}`} className="nav-link w-fit">
          Back to Search
        </Link>
        <StalenessIndicator
          rulingsStale={refreshStatus.rulingsStale}
          pricesStale={refreshStatus.pricesStale}
          totalPrintings={printingIds.length}
        />
      </div>

      <CardIntelligenceWorkspace card={card} />
    </AppShell>
  );
}
