import { NextResponse } from "next/server";
import { z } from "zod";
import {
  COLLECTION_CONDITIONS,
  COLLECTION_FINISHES,
  createAddLibraryCardService,
  createListLibraryCardsService,
  normalizeLibrarySearchParams,
  toLibraryRecordListView,
} from "@/modules/library";
import { requireApiAppUser } from "@/server/auth";

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
  const normalized = normalizeLibrarySearchParams({
    query: url.searchParams.get("query") ?? undefined,
    colors: url.searchParams.get("colors") ?? undefined,
    finish: url.searchParams.get("finish") ?? undefined,
    condition: url.searchParams.get("condition") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  }, "api_library_query");

  const service = createListLibraryCardsService(auth.appUser.appUserId);

  try {
    const records = await service.execute({
      ...(normalized.query ? { query: normalized.query } : {}),
      ...(normalized.colors.length > 0 ? { colors: normalized.colors } : {}),
      ...(normalized.finish ? { finish: normalized.finish } : {}),
      ...(normalized.condition ? { condition: normalized.condition } : {}),
      pageSize: normalized.pageSize,
    });

    return NextResponse.json({ data: toLibraryRecordListView(records) });
  } catch (error) {
    console.error("[Filters][library] Failed to apply filters.", {
      query: normalized,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ data: [] });
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
