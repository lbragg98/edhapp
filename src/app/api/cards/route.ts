import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSearchCardsService,
  parseCardColorCsv,
  toCardSearchResultView,
  CARD_POOLS,
  CARD_SORTS,
} from "@/modules/catalog";
import { requireApiAppUser } from "@/server/auth";

const querySchema = z.object({
  query: z.string().optional(),
  colors: z.string().optional(),
  typeLine: z.string().optional(),
  commanderOnly: z.enum(["true", "false"]).optional(),
  pool: z.enum(CARD_POOLS).optional(),
  sort: z.enum(CARD_SORTS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(36).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);

  const parsed = querySchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    colors: url.searchParams.get("colors") ?? undefined,
    typeLine: url.searchParams.get("typeLine") ?? undefined,
    commanderOnly: url.searchParams.get("commanderOnly") ?? undefined,
    pool: url.searchParams.get("pool") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const auth = parsed.data.pool === "library" ? await requireApiAppUser() : { appUser: null, response: null };
  if (auth.response) {
    return auth.response;
  }

  const service = createSearchCardsService(auth.appUser?.appUserId);
  const colors = parseCardColorCsv(parsed.data.colors, "api_cards_query");

  try {
    const result = await service.execute({
      ...(parsed.data.query ? { query: parsed.data.query } : {}),
      ...(colors ? { colors } : {}),
      ...(parsed.data.typeLine ? { typeLine: parsed.data.typeLine } : {}),
      ...(parsed.data.commanderOnly !== undefined
        ? { commanderOnly: parsed.data.commanderOnly === "true" }
        : {}),
      ...(parsed.data.pool ? { pool: parsed.data.pool } : {}),
      ...(parsed.data.sort ? { sort: parsed.data.sort } : {}),
      ...(parsed.data.page !== undefined ? { page: parsed.data.page } : {}),
      ...(parsed.data.pageSize !== undefined ? { pageSize: parsed.data.pageSize } : {}),
    });

    return NextResponse.json({ data: toCardSearchResultView(result) });
  } catch (error) {
    console.error("[Filters][cards] Failed to apply filters.", {
      query: parsed.data,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Unable to apply card filters" }, { status: 400 });
  }
}
