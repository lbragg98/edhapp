import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeOcrText } from "@/modules/scanner/ocr/normalize-ocr-text";
import { requireDiagnosticsAccess, withTimeout } from "@/server/dev/diagnostics-access";
import { runScryfallMatchCheck } from "@/server/dev/diagnostics-checks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  text: z.string().trim().min(1).max(160),
});

export async function POST(request: Request) {
  const access = requireDiagnosticsAccess(request);
  if (!access.ok) {
    return access.response;
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const result = await withTimeout(runScryfallMatchCheck(body.data.text), 15_000, "SCRYFALL_DIAGNOSTIC_TIMEOUT");
    return NextResponse.json(
      {
        input: body.data.text,
        normalized: normalizeOcrText(body.data.text),
        ...result,
      },
      {
        status: result.ok ? 200 : 404,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Scryfall diagnostic failed.",
      },
      { status: 503 },
    );
  }
}

