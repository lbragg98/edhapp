import sharp from "sharp";
import Tesseract from "tesseract.js";
import type {
  OcrRegionResult,
  ScannerOcrAdapter,
  ScannerOcrRecognitionResult,
  ScannerProcessedImage,
  ScannerRegion,
} from "@/modules/scanner/domain/scanner-record";

const { createWorker, PSM } = Tesseract;

const OCR_TIMEOUT_MS = 12_000;
const MAX_OCR_WIDTH = 800;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function toRectangle(
  region: ScannerRegion,
  width: number,
  height: number,
): { left: number; top: number; width: number; height: number } {
  const left = Math.floor(clamp01(region.x) * width);
  const top = Math.floor(clamp01(region.y) * height);
  const rectWidth = Math.max(8, Math.floor(clamp01(region.width) * width));
  const rectHeight = Math.max(8, Math.floor(clamp01(region.height) * height));

  return {
    left: Math.min(left, Math.max(0, width - 8)),
    top: Math.min(top, Math.max(0, height - 8)),
    width: Math.min(rectWidth, width - left),
    height: Math.min(rectHeight, height - top),
  };
}

async function cropRegionBuffer(
  image: ScannerProcessedImage,
  region: ScannerRegion,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const source = Buffer.from(image.bytes);
  const metadata = await sharp(source).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to read image dimensions for OCR region crop.");
  }

  const rectangle = toRectangle(region, metadata.width, metadata.height);

  const pipeline = sharp(source).extract(rectangle);
  const resized = rectangle.width > MAX_OCR_WIDTH
    ? pipeline.resize({ width: MAX_OCR_WIDTH, withoutEnlargement: true })
    : pipeline;

  const output = await resized
    .grayscale()
    .normalize()
    .sharpen()
    .gamma(1.15)
    .png()
    .toBuffer();

  const outputMeta = await sharp(output).metadata();
  return {
    buffer: output,
    width: outputMeta.width ?? rectangle.width,
    height: outputMeta.height ?? rectangle.height,
  };
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("OCR_TIMEOUT"));
    }, timeoutMs);

    operation
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export class TesseractOcrAdapter implements ScannerOcrAdapter {
  private static workerPromise: ReturnType<typeof createWorker> | null = null;
  private static queue: Promise<void> = Promise.resolve();

  private static async getWorker() {
    if (!this.workerPromise) {
      this.workerPromise = createWorker("eng");
      const worker = await this.workerPromise;
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      });
    }

    return this.workerPromise;
  }

  private static enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.then(() => undefined, () => undefined);
    return run;
  }

  async recognize(input: {
    image: ScannerProcessedImage;
    regions: ScannerRegion[];
  }): Promise<ScannerOcrRecognitionResult> {
    if (input.regions.length === 0) {
      return {
        status: "unavailable",
        regions: [],
        message: "No OCR regions were provided.",
      };
    }

    try {
      return await TesseractOcrAdapter.enqueue(async () => {
        const startedAt = Date.now();
        const worker = await TesseractOcrAdapter.getWorker();
        const results: OcrRegionResult[] = [];

        for (const region of input.regions) {
          const regionStartedAt = Date.now();
          const crop = await cropRegionBuffer(input.image, region);
          const response = await withTimeout(worker.recognize(crop.buffer), OCR_TIMEOUT_MS);

          const text = response.data.text.trim();
          if (!text) {
            continue;
          }

          results.push({
            regionId: region.id,
            text,
            confidence: Number(clamp01((response.data.confidence ?? 0) / 100).toFixed(4)),
            durationMs: Date.now() - regionStartedAt,
            cropWidth: crop.width,
            cropHeight: crop.height,
          });
        }

        return {
          status: "ok" as const,
          regions: results,
          totalDurationMs: Date.now() - startedAt,
          workerInitialized: true,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "OCR failed";
      if (message === "OCR_TIMEOUT") {
        return {
          status: "timeout",
          regions: [],
          message: "OCR request timed out.",
          workerInitialized: true,
        };
      }

      console.error("[Scanner][ocr] Tesseract OCR failed.", { message });
      return {
        status: "unavailable",
        regions: [],
        message,
        workerInitialized: this.constructor === TesseractOcrAdapter ? Boolean(TesseractOcrAdapter.workerPromise) : false,
      };
    }
  }
}
