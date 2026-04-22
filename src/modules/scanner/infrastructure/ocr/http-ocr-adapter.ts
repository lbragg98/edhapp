import { z } from "zod";
import type {
  OcrRegionResult,
  ScannerOcrAdapter,
  ScannerProcessedImage,
  ScannerRegion,
} from "@/modules/scanner/domain/scanner-record";

const ocrResponseSchema = z.object({
  regions: z.array(
    z.object({
      regionId: z.string(),
      text: z.string(),
      confidence: z.number().min(0).max(1),
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
  }): Promise<OcrRegionResult[]> {
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
      return [];
    }

    const json = (await response.json()) as unknown;
    const parsed = ocrResponseSchema.safeParse(json);

    if (!parsed.success) {
      return [];
    }

    return parsed.data.regions;
  }
}
