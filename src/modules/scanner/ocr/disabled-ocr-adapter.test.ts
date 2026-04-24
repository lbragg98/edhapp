import { describe, expect, it } from "vitest";
import { DisabledOcrProvider } from "@/modules/scanner/ocr/disabled-ocr-adapter";

describe("DisabledOcrProvider", () => {
  it("returns a structured unavailable response for scanner fallback behavior", async () => {
    const provider = new DisabledOcrProvider("OCR disabled for diagnostics.");
    const result = await provider.recognize({
      image: {
        bytes: new Uint8Array([1]),
        mimeType: "image/png",
      },
      regions: [{ id: "r", x: 0, y: 0, width: 1, height: 1, confidence: 1 }],
    });

    expect(result.status).toBe("unavailable");
    expect(result.failureStage).toBe("worker_init");
    expect(result.message).toContain("disabled");
  });
});

