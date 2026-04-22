import { NextResponse } from "next/server";
import { z } from "zod";
import {
  COLLECTION_CONDITIONS,
  COLLECTION_FINISHES,
  createAddLibraryCardService,
  createListLibraryCardsService,
  toLibraryRecordListView,
} from "@/modules/library";
import { parseCardColorCsv } from "@/modules/catalog";
import { requireApiAppUser } from "@/server/auth";

const querySchema = z.object({
  query: z.string().optional(),
  colors: z.string().optional(),
  finish: z.enum(COLLECTION_FINISHES).optional(),
  condition: z.enum(COLLECTION_CONDITIONS).optional(),
  pageSize: z.coerce.number().int().min(1).max(60).optional(),
});

const addBodySchema = z.object({
  scryfallCardId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(250).optional(),
  finish: z.enum(COLLECTION_FINISHES).optional(),
  condition: z.enum(COLLECTION_CONDITIONS).optional(),
  note: z.string().trim().max(250).optional(),
});

export async function GET(request: Request) {
  const auth = await requireApiAppUser();
  if (auth.response) {
    return auth.response;
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    colors: url.searchParams.get("colors") ?? undefined,
    finish: url.searchParams.get("finish") ?? undefined,
    condition: url.searchParams.get("condition") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const service = createListLibraryCardsService(auth.appUser.appUserId);
  const colors = parseCardColorCsv(parsed.data.colors, "api_library_query");

  try {
    const records = await service.execute({
      ...(parsed.data.query ? { query: parsed.data.query } : {}),
      ...(colors ? { colors } : {}),
      ...(parsed.data.finish ? { finish: parsed.data.finish } : {}),
      ...(parsed.data.condition ? { condition: parsed.data.condition } : {}),
      ...(parsed.data.pageSize !== undefined ? { pageSize: parsed.data.pageSize } : {}),
    });

    return NextResponse.json({ data: toLibraryRecordListView(records) });
  } catch (error) {
    console.error("[Filters][library] Failed to apply filters.", {
      query: parsed.data,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Unable to apply library filters" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiAppUser();
  if (auth.response) {
    return auth.response;
  }

  const body = addBodySchema.safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const service = createAddLibraryCardService(auth.appUser.appUserId);
  const record = await service.execute(body.data);

  if (!record) {
    return NextResponse.json({ error: "Library service unavailable" }, { status: 503 });
  }

  return NextResponse.json({ data: record }, { status: 201 });
}
