import type { ScannerIssue, ScannerProcessedImage } from "@/modules/scanner/domain/scanner-record";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function preprocessImageFromFile(
  file: File | null,
): Promise<{ image: ScannerProcessedImage | null; issues: ScannerIssue[] }> {
  if (!file) {
    return {
      image: null,
      issues: [{ code: "image_missing", message: "No image provided. Capture or upload a card photo first." }],
    };
  }

  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return {
      image: null,
      issues: [{ code: "image_invalid", message: `Unsupported image type: ${file.type || "unknown"}.` }],
    };
  }

  const buffer = await file.arrayBuffer();

  if (buffer.byteLength === 0) {
    return {
      image: null,
      issues: [{ code: "image_invalid", message: "Image payload is empty." }],
    };
  }

  return {
    image: {
      bytes: new Uint8Array(buffer),
      mimeType: file.type,
    },
    issues: [],
  };
}

