import type {
  ScannerOcrAdapter,
  ScannerOcrRecognitionResult,
} from "@/modules/scanner/domain/scanner-record";

export class NoopOcrAdapter implements ScannerOcrAdapter {
  async recognize(): Promise<ScannerOcrRecognitionResult> {
    return {
      status: "unavailable",
      regions: [],
      message: "OCR adapter not configured.",
    };
  }
}
