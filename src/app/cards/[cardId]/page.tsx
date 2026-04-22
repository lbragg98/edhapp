import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CardIntelligenceWorkspace,
} from "@/components/cards";
import { AppShell } from "@/components/layout";
import { createGetCardDetailService } from "@/modules/catalog";
import { requirePageAppUser } from "@/server/auth";

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
    notFound();
  }

  return (
    <AppShell>
      <div className="mb-5">
        <Link href={`/cards?pool=${pool}`} className="nav-link w-fit">
          Back to Search
        </Link>
      </div>

      <CardIntelligenceWorkspace card={card} />
    </AppShell>
  );
}
