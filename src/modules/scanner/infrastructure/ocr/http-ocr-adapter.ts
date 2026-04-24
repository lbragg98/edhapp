import { z } from "zod";
import type {
  ScannerOcrAdapter,
  ScannerOcrRecognitionResult,
  ScannerProcessedImage,
  ScannerRegion,
} from "@/modules/scanner/domain/scanner-record";

const ocrResponseSchema = z.object({
  totalDurationMs: z.number().optional(),
  workerInitialized: z.boolean().optional(),
  regions: z.array(
    z.object({
      regionId: z.string(),
      text: z.string(),
      confidence: z.number().min(0).max(1),
      durationMs: z.number().optional(),
      cropWidth: z.number().optional(),
      cropHeight: z.number().optional(),
    }),
  ),
});

export class HttpOcrAdapter implements ScannerOcrAdapter {
  constructor(
    private readonly options: {
      endpoint: string;
      apiKey?: string;
    },
  ) {}

  async recognize(input: {
    image: ScannerProcessedImage;
    regions: ScannerRegion[];
  }): Promise<ScannerOcrRecognitionResult> {
    const form = new FormData();
    const copied = new Uint8Array(input.image.bytes.length);
    copied.set(input.image.bytes);
    const blob = new Blob([copied], { type: input.image.mimeType });

    form.set("image", blob, `capture.${input.image.mimeType.split("/")[1] ?? "jpg"}`);
    form.set("regions", JSON.stringify(input.regions));

    const response = await fetch(this.options.endpoint, {
      method: "POST",
      ...(this.options.apiKey ? { headers: { "x-api-key": this.options.apiKey } } : {}),
      body: form,
    });

    if (!response.ok) {
      return {
        status: "unavailable",
        regions: [],
        message: `Remote OCR endpoint responded with ${response.status}.`,
      };
    }

    const json = (await response.json()) as unknown;
    const parsed = ocrResponseSchema.safeParse(json);

    if (!parsed.success) {
      return {
        status: "error",
        regions: [],
        message: "Remote OCR response payload validation failed.",
      };
    }

    return {
      status: "ok",
      regions: parsed.data.regions.map((region) => ({
        regionId: region.regionId,
        text: region.text,
        confidence: region.confidence,
        durationMs: region.durationMs ?? 0,
        cropWidth: region.cropWidth ?? 0,
        cropHeight: region.cropHeight ?? 0,
      })),
      totalDurationMs: parsed.data.totalDurationMs ?? 0,
      workerInitialized: parsed.data.workerInitialized ?? false,
    };
  }
}
