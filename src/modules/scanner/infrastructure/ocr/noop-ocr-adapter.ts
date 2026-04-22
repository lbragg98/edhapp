import type {
  OcrRegionResult,
  ScannerOcrAdapter,
} from "@/modules/scanner/domain/scanner-record";

export class NoopOcrAdapter implements ScannerOcrAdapter {
  async recognize(): Promise<OcrRegionResult[]> {
    return [];
  }
}

