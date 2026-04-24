import type { ScannerOcrAdapter } from "@/modules/scanner/domain/scanner-record";
import { HttpOcrAdapter } from "@/modules/scanner/infrastructure/ocr/http-ocr-adapter";
import { DisabledOcrProvider } from "@/modules/scanner/ocr/disabled-ocr-adapter";
import { TesseractOcrAdapter } from "@/modules/scanner/ocr/tesseract-ocr-adapter";
import { env } from "@/server/config/env";

export type OcrProviderMode = "browser" | "server" | "disabled";

export class BrowserTesseractOcrProvider extends TesseractOcrAdapter {}
export class ServerOcrProvider extends HttpOcrAdapter {}

export function resolveOcrProviderMode(): OcrProviderMode {
  return env.OCR_PROVIDER ?? "browser";
}

export function createOcrProvider(): { mode: OcrProviderMode; adapter: ScannerOcrAdapter } {
  const mode = resolveOcrProviderMode();

  if (mode === "disabled") {
    return {
      mode,
      adapter: new DisabledOcrProvider("OCR provider disabled. Use manual search fallback."),
    };
  }

  if (mode === "server") {
    if (!env.SCANNER_OCR_ENDPOINT) {
      return {
        mode: "disabled",
        adapter: new DisabledOcrProvider(
          "OCR_PROVIDER=server requires SCANNER_OCR_ENDPOINT. Configure endpoint or switch provider.",
        ),
      };
    }

    return {
      mode,
      adapter: new ServerOcrProvider({
        endpoint: env.SCANNER_OCR_ENDPOINT,
        ...(env.SCANNER_OCR_API_KEY ? { apiKey: env.SCANNER_OCR_API_KEY } : {}),
      }),
    };
  }

  return {
    mode: "browser",
    adapter: new BrowserTesseractOcrProvider(),
  };
}
