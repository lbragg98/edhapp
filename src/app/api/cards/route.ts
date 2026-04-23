import { NextResponse } from "next/server";
import {
  createSearchCardsService,
  normalizeCardSearchParams,
  toCardSearchResultView,
} from "@/modules/catalog";
import { requireApiAppUser } from "@/server/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const normalized = normalizeCardSearchParams(
    {
      query: url.searchParams.get("query"),
      colors: url.searchParams.get("colors"),
      typeLine: url.searchParams.get("typeLine"),
      commanderOnly: url.searchParams.get("commanderOnly"),
      pool: url.searchParams.get("pool"),
      sort: url.searchParams.get("sort"),
      page: url.searchParams.get("page"),
      pageSize: url.searchParams.get("pageSize"),
    },
    "api_cards_query",
    { defaultCommanderOnly: true, defaultPool: "all", defaultSort: "relevance", defaultPage: 1, defaultPageSize: 18 },
  );

  const auth = normalized.pool === "library" ? await requireApiAppUser() : { appUser: null, response: null };
  if (auth.response) {
    return auth.response;
  }

  const service = createSearchCardsService(auth.appUser?.appUserId);

  try {
    const result = await service.execute(normalized);

    return NextResponse.json({ data: toCardSearchResultView(result) });
  } catch (error) {
    console.error("[Filters][cards] Failed to apply filters.", {
      query: normalized,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({
      data: {
        items: [],
        hasMore: false,
        nextPage: null,
        total: 0,
      },
    });
  }
}
