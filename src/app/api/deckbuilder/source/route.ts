import { NextResponse } from "next/server";
import {
  DeckSourceService,
  normalizeDeckSourceParams,
  toDeckSourceResultView,
} from "@/modules/deckbuilder";
import { requireApiAppUser } from "@/server/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const normalized = normalizeDeckSourceParams({
    mode: url.searchParams.get("mode") ?? undefined,
    query: url.searchParams.get("query") ?? undefined,
    colors: url.searchParams.get("colors") ?? undefined,
    typeLine: url.searchParams.get("typeLine") ?? undefined,
    commanderOnly: url.searchParams.get("commanderOnly") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  }, "api_deckbuilder_source_query");

  const auth = normalized.mode === "library" ? await requireApiAppUser() : { appUser: null, response: null };
  if (auth.response) {
    return auth.response;
  }

  const service = new DeckSourceService(auth.appUser?.appUserId);
  try {
    const payload = await service.execute(normalized);

    return NextResponse.json({ data: toDeckSourceResultView(payload) });
  } catch (error) {
    console.error("[Filters][deckbuilder-source] Failed to apply filters.", {
      query: normalized,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ data: { mode: normalized.mode, items: [] } });
  }
}
