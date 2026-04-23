import { AppShell, SectionHeading } from "@/components/layout";
import { CardSearchExperience } from "@/components/cards";
import { createSearchCardsService, normalizeCardSearchParams } from "@/modules/catalog";
import { requirePageAppUser } from "@/server/auth";

export const dynamic = "force-dynamic";

type CardsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CardsPage({ searchParams }: CardsPageProps) {
  const params = await searchParams;

  const normalized = normalizeCardSearchParams(
    {
      query: params.query,
      colors: params.colors,
      typeLine: params.typeLine,
      commanderOnly: params.commanderOnly,
      pool: params.pool,
      sort: params.sort,
      page: params.page,
      pageSize: params.pageSize,
    },
    "cards_page_search_params",
    { defaultCommanderOnly: true, defaultPool: "all", defaultSort: "relevance", defaultPage: 1, defaultPageSize: 18 },
  );

  const appUser = normalized.pool === "library" ? await requirePageAppUser("/cards?pool=library") : null;
  const service = createSearchCardsService(appUser?.appUserId);
  const initialResult = await service.execute(normalized).catch((error) => {
    console.error("[Filters][cards_page] Failed to load initial card search result.", {
      query: normalized,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      items: [],
      hasMore: false,
      nextPage: null,
      total: 0,
    };
  });

  return (
    <AppShell>
      <SectionHeading
        eyebrow="Card Browser"
        title="Search commander-ready cards with a premium browsing flow."
        description="Fast Scryfall-backed retrieval, normalized records, and reusable card selection primitives for future deck modes."
      />

      <div className="mt-10">
        <CardSearchExperience
          initialResult={initialResult}
          initialQuery={normalized.query}
          initialTypeLine={normalized.typeLine}
          initialCommanderOnly={normalized.commanderOnly}
          initialSort={normalized.sort}
          initialPool={normalized.pool}
          initialColors={normalized.colors}
        />
      </div>
    </AppShell>
  );
}
