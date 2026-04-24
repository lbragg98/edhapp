import { NextResponse } from "next/server";
import { resolveAppUserSession } from "@/server/auth/session-resolver";
import { requireDiagnosticsAccess } from "@/server/dev/diagnostics-access";
import { runDbCheck, runOcrCheck } from "@/server/dev/diagnostics-checks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = requireDiagnosticsAccess(request);
  if (!access.ok) {
    return access.response;
  }

  const startedAt = Date.now();
  const [db, ocr, session] = await Promise.all([
    runDbCheck(),
    runOcrCheck(),
    resolveAppUserSession({ scope: "api" }),
  ]);

  return NextResponse.json(
    {
      ok: db.ok && ocr.ok,
      durationMs: Date.now() - startedAt,
      checks: {
        db,
        ocr,
        session: {
          status: session.status,
          ...(session.status === "provisioning_unavailable" ? { reason: session.reason } : {}),
        },
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
