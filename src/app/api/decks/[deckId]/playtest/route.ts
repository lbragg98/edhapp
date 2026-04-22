import { NextResponse } from "next/server";
import { z } from "zod";
import { createDeckService, toDeckPlaytestView } from "@/modules/deck";
import { requireApiAppUser } from "@/server/auth";

const paramsSchema = z.object({ deckId: z.string().trim().min(1) });

const querySchema = z.object({
  runs: z.coerce.number().int().min(20).max(2000).optional(),
  turns: z.coerce.number().int().min(4).max(10).optional(),
  sourceMode: z.enum(["all", "library"]).optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ deckId: string }> },
) {
  const auth = await requireApiAppUser();
  if (auth.response) {
    return auth.response;
  }

  const service = createDeckService(auth.appUser.appUserId);
  if (!service) {
    return NextResponse.json({ error: "Deck service unavailable" }, { status: 503 });
  }

  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: "Invalid deck id" }, { status: 400 });
  }

  const url = new URL(request.url);
  const query = querySchema.safeParse({
    runs: url.searchParams.get("runs") ?? undefined,
    turns: url.searchParams.get("turns") ?? undefined,
    sourceMode: url.searchParams.get("sourceMode") ?? undefined,
  });

  if (!query.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const report = await service.runPlaytest({
    deckId: params.data.deckId,
    ...(query.data.runs !== undefined ? { runs: query.data.runs } : {}),
    ...(query.data.turns !== undefined ? { turns: query.data.turns } : {}),
    ...(query.data.sourceMode ? { sourceMode: query.data.sourceMode } : {}),
  });

  if (!report) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  return NextResponse.json({ data: toDeckPlaytestView(report) });
}
