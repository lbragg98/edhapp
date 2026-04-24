import { NextResponse } from "next/server";
import { z } from "zod";
import { createDeckService, toDeckView } from "@/modules/deck";
import { requireDiagnosticsAccess, resolveDiagnosticsUserId, withTimeout } from "@/server/dev/diagnostics-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  sourceMode: z.enum(["all", "library"]).optional(),
});

export async function POST(request: Request) {
  const access = requireDiagnosticsAccess(request);
  if (!access.ok) {
    return access.response;
  }

  const body = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const user = await resolveDiagnosticsUserId();
  if (!user.userId) {
    return NextResponse.json({ error: "No diagnostics user available." }, { status: 503 });
  }

  const service = createDeckService(user.userId);
  if (!service) {
    return NextResponse.json({ error: "Deck service unavailable." }, { status: 503 });
  }

  try {
    const name = body.data.name ?? `Diagnostics Deck ${new Date().toISOString()}`;
    const created = await withTimeout(
      service.create({
        name,
        ...(body.data.sourceMode ? { sourceMode: body.data.sourceMode } : {}),
      }),
      10_000,
      "CREATE_DECK_TIMEOUT",
    );
    const loaded = await withTimeout(service.getById(created.deck.id), 10_000, "LOAD_DECK_TIMEOUT");

    return NextResponse.json(
      {
        ok: Boolean(loaded),
        userSource: user.source,
        sessionStatus: user.sessionStatus,
        createdDeckId: created.deck.id,
        createdDeck: toDeckView(created.deck),
        loadedDeckId: loaded?.deck.id ?? null,
      },
      { status: loaded ? 200 : 503 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Deck diagnostics failed.",
      },
      { status: 503 },
    );
  }
}

