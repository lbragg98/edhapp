import { NextResponse } from "next/server";
import { z } from "zod";
import { createGetCardDetailService, toCardDetailView, CARD_POOLS } from "@/modules/catalog";
import { requireApiAppUser } from "@/server/auth";

const paramsSchema = z.object({
  cardId: z.string().trim().min(1),
});

const querySchema = z.object({
  pool: z.enum(CARD_POOLS).optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ cardId: string }> },
) {
  const params = paramsSchema.safeParse(await context.params);

  if (!params.success) {
    return NextResponse.json({ error: "Invalid card id" }, { status: 400 });
  }

  const url = new URL(request.url);
  const query = querySchema.safeParse({
    pool: url.searchParams.get("pool") ?? undefined,
  });

  if (!query.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const auth = query.data.pool === "library" ? await requireApiAppUser() : { appUser: null, response: null };
  if (auth.response) {
    return auth.response;
  }

  const service = createGetCardDetailService(auth.appUser?.appUserId);
  const card = await service.execute({
    cardId: params.data.cardId,
    ...(query.data.pool ? { pool: query.data.pool } : {}),
  });

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json({ data: toCardDetailView(card) });
}
