import { NextResponse } from "next/server";
import { getScannerOcrRuntimeStatus } from "@/modules/scanner";
import { requireApiAppUser } from "@/server/auth";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApiAppUser();
  if (auth.response) {
    return auth.response;
  }

  try {
    const status = await getScannerOcrRuntimeStatus();
    return NextResponse.json({ data: status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OCR status error";
    return NextResponse.json(
      {
        data: {
          ready: false,
          initializing: false,
          workerInitialized: false,
          source: "local_tesseract",
          lastError: message,
          failureStage: "worker_init",
        },
      },
      { status: 503 },
    );
  }
}

