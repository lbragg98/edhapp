import { NextResponse } from "next/server";
import { requireDiagnosticsAccess } from "@/server/dev/diagnostics-access";
import { runDbCheck } from "@/server/dev/diagnostics-checks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = requireDiagnosticsAccess(request);
  if (!access.ok) {
    return access.response;
  }

  const result = await runDbCheck();
  return NextResponse.json(
    { data: result },
    {
      status: result.ok ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}

