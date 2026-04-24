import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpOcrAdapter } from "@/modules/scanner/infrastructure/ocr/http-ocr-adapter";

describe("HttpOcrAdapter", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns timeout status when remote OCR request does not resolve", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_, init) => {
        const signal = init?.signal as AbortSignal | undefined;
        return new Promise<Response>((_, reject) => {
          signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        });
      }),
    );

    const adapter = new HttpOcrAdapter({ endpoint: "https://example.com/ocr" });
    const promise = adapter.recognize({
      image: {
        bytes: new Uint8Array([1, 2, 3]),
        mimeType: "image/png",
      },
      regions: [{ id: "r", x: 0, y: 0, width: 1, height: 1, confidence: 1 }],
    });

    await vi.advanceTimersByTimeAsync(16_000);
    const result = await promise;

    expect(result.status).toBe("timeout");
    expect(result.failureStage).toBe("ocr_recognize");
  });
});

