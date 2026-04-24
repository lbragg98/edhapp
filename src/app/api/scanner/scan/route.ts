import { NextResponse } from "next/server";
import { createScannerPipelineService, preprocessImageFromFile, toScannerScanView } from "@/modules/scanner";
import { requireApiAppUser } from "@/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireApiAppUser();
  if (auth.response) {
    return auth.response;
  }

  try {
    const form = await request.formData();
    const image = form.get("image");
    const manualText = form.get("manualText");

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const preprocessed = await preprocessImageFromFile(image);
    if (!preprocessed.image) {
      return NextResponse.json({ data: { issues: preprocessed.issues } }, { status: 400 });
    }

    const service = createScannerPipelineService(auth.appUser.appUserId);
    const result = await service.execute({
      image: preprocessed.image,
      ...(typeof manualText === "string" && manualText.trim() ? { manualText: manualText.trim() } : {}),
    });

    const hasScannerFailures = result.issues.some((issue) =>
      ["ocr_unavailable", "ocr_timeout", "candidate_match_failed", "scan_error"].includes(issue.code),
    );
    if (hasScannerFailures) {
      console.warn("[Scanner][scan] Completed with non-fatal scanner issues.", {
        userId: auth.appUser.appUserId,
        issues: result.issues.map((issue) => issue.code),
        extractedTextLength: result.extractedText.length,
        topCandidateConfidence: result.candidates[0]?.confidence ?? null,
      });
    }

    return NextResponse.json({ data: toScannerScanView(result) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Scanner][scan] Scan pipeline failed.", {
      userId: auth.appUser.appUserId,
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Scan pipeline failed. Please retry with a clearer image or manual hints.",
        issues: [{ code: "scan_error", message: message }],
      },
      { status: 500 },
    );
  }
}
