import { AppShell, SectionHeading } from "@/components/layout";
import { CardSearchExperience } from "@/components/cards";
import { createSearchCardsService } from "@/modules/catalog";
import { requirePageAppUser } from "@/server/auth";

export const dynamic = "force-dynamic";

type CardsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseString(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function parseBoolean(value: string | string[] | undefined, fallback: boolean): boolean {
  if (typeof value !== "string") {
    return fallback;
  }

  return value === "true";
}

function parseColors(value: string | string[] | undefined): string[] {
  if (typeof value !== "string" || !value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);
}

function parseSort(value: string | string[] | undefined): "relevance" | "name" | "released" {
  if (value === "name" || value === "released") {
    return value;
  }

  return "relevance";
}

function parsePool(value: string | string[] | undefined): "all" | "library" {
  if (value === "library") {
    return "library";
  }

  return "all";
}

export default async function CardsPage({ searchParams }: CardsPageProps) {
  const params = await searchParams;

  const query = parseString(params.query);
  const typeLine = parseString(params.typeLine);
  const commanderOnly = parseBoolean(params.commanderOnly, true);
  const sort = parseSort(params.sort);
  const pool = parsePool(params.pool);
  const colors = parseColors(params.colors);

  const appUser = pool === "library" ? await requirePageAppUser("/cards?pool=library") : null;
  const service = createSearchCardsService(appUser?.appUserId);
  const initialResult = await service.execute({
    query,
    typeLine,
    commanderOnly,
    sort,
    pool,
    colors,
    pageSize: 18,
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
          initialQuery={query}
          initialTypeLine={typeLine}
          initialCommanderOnly={commanderOnly}
          initialSort={sort}
          initialPool={pool}
          initialColors={colors}
        />
      </div>
    </AppShell>
  );
}
