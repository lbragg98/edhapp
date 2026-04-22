import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createDeckService,
  toDeckAnalyticsView,
  toDeckIntelligenceView,
  toDeckValidationView,
  toDeckView,
} from "@/modules/deck";
import { requireApiAppUser } from "@/server/auth";

const paramsSchema = z.object({ deckId: z.string().trim().min(1) });

const updateBodySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(250).optional(),
  notes: z.string().trim().max(2000).optional(),
  sourceMode: z.enum(["all", "library"]).optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).optional(),
});

export async function GET(
  _: Request,
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

  const payload = await service.getById(params.data.deckId);

  if (!payload) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      deck: toDeckView(payload.deck),
      validation: toDeckValidationView(payload.validation),
      analytics: toDeckAnalyticsView(payload.analytics),
      intelligence: toDeckIntelligenceView(payload.intelligence),
    },
  });
}

export async function PATCH(
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

  const body = updateBodySchema.safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = await service.updateMetadata({
    deckId: params.data.deckId,
    ...(body.data.name ? { name: body.data.name } : {}),
    ...(body.data.description !== undefined ? { description: body.data.description } : {}),
    ...(body.data.notes !== undefined ? { notes: body.data.notes } : {}),
    ...(body.data.sourceMode ? { sourceMode: body.data.sourceMode } : {}),
    ...(body.data.tags ? { tags: body.data.tags } : {}),
  });

  if (!payload) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      deck: toDeckView(payload.deck),
      validation: toDeckValidationView(payload.validation),
      analytics: toDeckAnalyticsView(payload.analytics),
      intelligence: toDeckIntelligenceView(payload.intelligence),
    },
  });
}
