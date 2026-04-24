export type StabilityAssessment = {
  isStable: boolean;
  stableFrames: number;
  averageDelta: number;
};

type StabilityDetectorOptions = {
  minStableFrames: number;
  maxAverageDelta: number;
};

const DEFAULT_OPTIONS: StabilityDetectorOptions = {
  minStableFrames: 3,
  maxAverageDelta: 7,
};

export class FrameStabilityDetector {
  private previousSignature: Uint8ClampedArray | null = null;
  private stableFrames = 0;
  private readonly options: StabilityDetectorOptions;

  constructor(options?: Partial<StabilityDetectorOptions>) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  reset() {
    this.previousSignature = null;
    this.stableFrames = 0;
  }

  update(signature: Uint8ClampedArray): StabilityAssessment {
    if (!this.previousSignature || this.previousSignature.length !== signature.length) {
      this.previousSignature = signature;
      this.stableFrames = 0;
      return {
        isStable: false,
        stableFrames: this.stableFrames,
        averageDelta: Number.POSITIVE_INFINITY,
      };
    }

    let totalDelta = 0;
    for (let index = 0; index < signature.length; index += 1) {
      totalDelta += Math.abs(signature[index]! - this.previousSignature[index]!);
    }
    const averageDelta = totalDelta / signature.length;

    if (averageDelta <= this.options.maxAverageDelta) {
      this.stableFrames += 1;
    } else {
      this.stableFrames = 0;
    }

    this.previousSignature = signature;

    return {
      isStable: this.stableFrames >= this.options.minStableFrames,
      stableFrames: this.stableFrames,
      averageDelta,
    };
  }
}

