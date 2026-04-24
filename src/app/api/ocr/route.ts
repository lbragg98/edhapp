import { z } from "zod";
import { NextResponse } from "next/server";
import { preprocessImageFromFile } from "@/modules/scanner";
import type { ScannerRegion } from "@/modules/scanner/domain/scanner-record";
import { TesseractOcrAdapter } from "@/modules/scanner/ocr/tesseract-ocr-adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const regionsSchema = z.array(
  z.object({
    id: z.string(),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().min(0).max(1),
    height: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1).default(0.5),
  }),
);

const fallbackRegions: ScannerRegion[] = [
  { id: "name-bar", x: 0.05, y: 0.04, width: 0.9, height: 0.16, confidence: 0.5 },
];

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const image = form.get("image");
    const regionsJson = form.get("regions");

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const preprocessed = await preprocessImageFromFile(image);
    if (!preprocessed.image) {
      return NextResponse.json({ error: preprocessed.issues[0]?.message ?? "Invalid image." }, { status: 400 });
    }

    const parsedRegions = typeof regionsJson === "string"
      ? regionsSchema.safeParse(JSON.parse(regionsJson) as unknown)
      : null;
    const regions = parsedRegions?.success ? parsedRegions.data : fallbackRegions;

    const adapter = new TesseractOcrAdapter();
    const result = await adapter.recognize({
      image: preprocessed.image,
      regions,
    });

    const status = result.status === "ok" ? 200 : result.status === "timeout" ? 504 : 503;
    return NextResponse.json(result, {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "OCR request failed.",
      },
      { status: 500 },
    );
  }
}

