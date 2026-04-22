import { NextResponse } from "next/server";
import { createScannerPipelineService, preprocessImageFromFile, toScannerScanView } from "@/modules/scanner";
import { requireApiAppUser } from "@/server/auth";

export async function POST(request: Request) {
  const auth = await requireApiAppUser();
  if (auth.response) {
    return auth.response;
  }

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

  return NextResponse.json({ data: toScannerScanView(result) });
}
