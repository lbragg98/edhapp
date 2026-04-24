import type {
  ScannerOcrAdapter,
  ScannerOcrRecognitionResult,
  ScannerProcessedImage,
  ScannerRegion,
} from "@/modules/scanner/domain/scanner-record";

export class DisabledOcrProvider implements ScannerOcrAdapter {
  constructor(private readonly message = "OCR provider is disabled by configuration.") {}

  async recognize(input: {
    image: ScannerProcessedImage;
    regions: ScannerRegion[];
  }): Promise<ScannerOcrRecognitionResult> {
    void input;
    return {
      status: "unavailable",
      regions: [],
      message: this.message,
      workerInitialized: false,
      failureStage: "worker_init",
    };
  }
}
