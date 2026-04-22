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

const addCardBodySchema = z.object({
  sourceMode: z.enum(["all", "library"]),
  sourceItemId: z.string().trim().min(1),
  cardId: z.string().trim().min(1),
  scryfallId: z.string().trim().min(1),
  printingId: z.string().trim().nullable(),
  zone: z.enum(["commander", "mainboard"]),
});

const adjustCardBodySchema = z.object({
  entryId: z.string().trim().min(1),
  delta: z.number().int().min(-10).max(10).refine((value) => value !== 0),
});

export async function POST(
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

  const body = addCardBodySchema.safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = await service.addCard({
    deckId: params.data.deckId,
    ...body.data,
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

  const body = adjustCardBodySchema.safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = await service.adjustCard({
    deckId: params.data.deckId,
    entryId: body.data.entryId,
    delta: body.data.delta,
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
