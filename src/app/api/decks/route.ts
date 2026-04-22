import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createDeckService,
  toDeckAnalyticsView,
  toDeckIntelligenceView,
  toDeckListView,
  toDeckValidationView,
  toDeckView,
} from "@/modules/deck";
import { requireApiAppUser } from "@/server/auth";

const createDeckBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  sourceMode: z.enum(["all", "library"]).optional(),
  description: z.string().trim().max(250).optional(),
  notes: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).optional(),
});

export async function GET() {
  const auth = await requireApiAppUser();
  if (auth.response) {
    return auth.response;
  }

  const service = createDeckService(auth.appUser.appUserId);

  if (!service) {
    return NextResponse.json({ error: "Deck service unavailable" }, { status: 503 });
  }

  const decks = await service.list();

  return NextResponse.json({ data: toDeckListView(decks) });
}

export async function POST(request: Request) {
  const auth = await requireApiAppUser();
  if (auth.response) {
    return auth.response;
  }

  const service = createDeckService(auth.appUser.appUserId);

  if (!service) {
    return NextResponse.json({ error: "Deck service unavailable" }, { status: 503 });
  }

  const body = createDeckBodySchema.safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = await service.create({
    name: body.data.name,
    ...(body.data.sourceMode ? { sourceMode: body.data.sourceMode } : {}),
    ...(body.data.description ? { description: body.data.description } : {}),
    ...(body.data.notes ? { notes: body.data.notes } : {}),
    ...(body.data.tags ? { tags: body.data.tags } : {}),
  });

  return NextResponse.json(
    {
      data: {
        deck: toDeckView(payload.deck),
        validation: toDeckValidationView(payload.validation),
        analytics: toDeckAnalyticsView(payload.analytics),
        intelligence: toDeckIntelligenceView(payload.intelligence),
      },
    },
    { status: 201 },
  );
}
