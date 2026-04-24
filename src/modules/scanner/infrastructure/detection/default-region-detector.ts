import type {
  ScannerProcessedImage,
  ScannerRegion,
  ScannerRegionDetector,
} from "@/modules/scanner/domain/scanner-record";
import { buildFallbackNameRegions } from "@/modules/scanner/recognition/crop-card-name-region";

export class DefaultRegionDetector implements ScannerRegionDetector {
  async detect(input: ScannerProcessedImage): Promise<ScannerRegion[]> {
    void input;
    // OCR quality is significantly better when we target the name bar first.
    return buildFallbackNameRegions();
  }
}
