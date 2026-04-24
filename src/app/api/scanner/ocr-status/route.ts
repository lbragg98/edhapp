import { NextResponse } from "next/server";
import { getScannerOcrRuntimeStatus } from "@/modules/scanner";
import { requireApiAppUser } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiAppUser();
  if (auth.response) {
    return auth.response;
  }

  try {
    const status = await getScannerOcrRuntimeStatus();
    return NextResponse.json(
      { data: status },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OCR status error";
    return NextResponse.json(
      {
        data: {
          ready: false,
          initializing: false,
          workerInitialized: false,
          source: "local_tesseract",
          provider: "browser",
          lastError: message,
          failureStage: "worker_init",
          initDurationMs: null,
          initPhase: "failed",
          assetPaths: {
            langPath: "unknown",
            corePath: "unknown",
            workerPath: "unknown",
            cachePath: "unknown",
          },
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  }
}
