import { NextResponse } from "next/server";
import { z } from "zod";
import { createDeckService } from "@/modules/deck";
import { generateDeckPlaytestPdf } from "@/modules/playtest-pdf";
import { requireApiAppUser } from "@/server/auth";

const paramsSchema = z.object({ deckId: z.string().trim().min(1) });

function toDownloadFileName(deckName: string): string {
  const safe = deckName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 64);

  return `${safe || "deck"}-playtest.pdf`;
}

export async function GET(_: Request, context: { params: Promise<{ deckId: string }> }) {
  const auth = await requireApiAppUser();
  if (auth.response) {
    return auth.response;
  }

  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: "Invalid deck id" }, { status: 400 });
  }

  const deckService = createDeckService(auth.appUser.appUserId);
  if (!deckService) {
    return NextResponse.json({ error: "Deck service unavailable" }, { status: 503 });
  }

  const payload = await deckService.getById(params.data.deckId);
  if (!payload) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  try {
    const pdfBytes = await generateDeckPlaytestPdf(payload.deck);
    const fileName = toDownloadFileName(payload.deck.name);
    const pdfArrayBuffer = Uint8Array.from(pdfBytes).buffer;

    return new NextResponse(pdfArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate playtest PDF",
      },
      { status: 500 },
    );
  }
}
