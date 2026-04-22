import type {
  ScannerProcessedImage,
  ScannerRegion,
  ScannerRegionDetector,
} from "@/modules/scanner/domain/scanner-record";

export class DefaultRegionDetector implements ScannerRegionDetector {
  async detect(input: ScannerProcessedImage): Promise<ScannerRegion[]> {
    void input;
    // Foundation behavior: assume one full-card region until CV detector is plugged in.
    return [
      {
        id: "r0",
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        confidence: 0.4,
      },
    ];
  }
}
