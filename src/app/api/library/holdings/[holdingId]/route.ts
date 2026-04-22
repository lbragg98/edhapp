import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdjustLibraryHoldingService } from "@/modules/library";
import { requireApiAppUser } from "@/server/auth";

const paramsSchema = z.object({
  holdingId: z.string().trim().min(1),
});

const bodySchema = z.object({
  delta: z.number().int().min(-250).max(250).refine((value) => value !== 0),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ holdingId: string }> },
) {
  const auth = await requireApiAppUser();
  if (auth.response) {
    return auth.response;
  }

  const params = paramsSchema.safeParse(await context.params);

  if (!params.success) {
    return NextResponse.json({ error: "Invalid holding id" }, { status: 400 });
  }

  const body = bodySchema.safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const service = createAdjustLibraryHoldingService(auth.appUser.appUserId);
  const record = await service.execute({ holdingId: params.data.holdingId, delta: body.data.delta });

  return NextResponse.json({ data: record });
}
