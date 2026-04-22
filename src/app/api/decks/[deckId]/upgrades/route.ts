import { NextResponse } from "next/server";
import { z } from "zod";
import { createDeckService, toDeckUpgradeView } from "@/modules/deck";
import { requireApiAppUser } from "@/server/auth";

const paramsSchema = z.object({ deckId: z.string().trim().min(1) });

const querySchema = z.object({
  mode: z.enum(["all", "library"]).optional(),
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
    mode: url.searchParams.get("mode") ?? undefined,
  });

  if (!query.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const report = await service.runUpgrades({
    deckId: params.data.deckId,
    ...(query.data.mode ? { mode: query.data.mode } : {}),
  });

  if (!report) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  return NextResponse.json({ data: toDeckUpgradeView(report) });
}
