export type FrameSamplerOptions = {
  intervalMs: number;
};

export class FrameSampler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight = false;

  start(task: () => Promise<void>, options: FrameSamplerOptions = { intervalMs: 900 }) {
    this.stop();
    this.timer = setInterval(async () => {
      if (this.inFlight) {
        return;
      }
      this.inFlight = true;
      try {
        await task();
      } finally {
        this.inFlight = false;
      }
    }, options.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.inFlight = false;
  }
}

