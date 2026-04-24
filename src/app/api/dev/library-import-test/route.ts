import { NextResponse } from "next/server";
import { z } from "zod";
import { createAddLibraryCardService } from "@/modules/library";
import { scryfallCardSchema } from "@/modules/catalog/infrastructure/scryfall/schemas";
import { requireDiagnosticsAccess, resolveDiagnosticsUserId, withTimeout } from "@/server/dev/diagnostics-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  scryfallCardId: z.string().trim().min(1).optional(),
  cardName: z.string().trim().min(1).max(120).optional(),
  quantity: z.number().int().min(1).max(10).default(1),
  finish: z.enum(["NONFOIL", "FOIL", "ETCHED"]).default("NONFOIL"),
  condition: z.enum(["NM", "LP", "MP", "HP", "DMG"]).default("NM"),
});

async function resolveScryfallId(input: z.infer<typeof requestSchema>): Promise<string> {
  if (input.scryfallCardId) {
    return input.scryfallCardId;
  }

  const name = input.cardName ?? "Sol Ring";
  const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Could not resolve Scryfall card by name: ${name}`);
  }

  const json = (await response.json()) as unknown;
  const parsed = scryfallCardSchema.parse(json);
  return parsed.id;
}

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

  const service = createAddLibraryCardService(user.userId);
  const cardId = await withTimeout(resolveScryfallId(body.data), 10_000, "SCRYFALL_CARD_RESOLVE_TIMEOUT");

  const first = await withTimeout(
    service.execute({
      scryfallCardId: cardId,
      quantity: body.data.quantity,
      finish: body.data.finish,
      condition: body.data.condition,
      note: "Diagnostics library import",
    }),
    15_000,
    "LIBRARY_IMPORT_FIRST_TIMEOUT",
  );
  const second = await withTimeout(
    service.execute({
      scryfallCardId: cardId,
      quantity: body.data.quantity,
      finish: body.data.finish,
      condition: body.data.condition,
      note: "Diagnostics library import",
    }),
    15_000,
    "LIBRARY_IMPORT_SECOND_TIMEOUT",
  );

  if (!first || !second) {
    return NextResponse.json(
      {
        ok: false,
        error: "Library import service unavailable.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      userSource: user.source,
      sessionStatus: user.sessionStatus,
      scryfallCardId: cardId,
      firstQuantity: first.quantity,
      secondQuantity: second.quantity,
      upserted: second.quantity >= first.quantity + body.data.quantity,
      holdingId: second.holdingId,
    },
    { status: 200 },
  );
}

