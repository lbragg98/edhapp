/**
 * Mobile-optimized image compression for scanner uploads.
 * Reduces file size while preserving enough detail for OCR accuracy.
 */

export type CompressionOptions = {
  /** Maximum dimension (width or height) in pixels. Default: 1920 */
  maxDimension?: number;
  /** JPEG quality (0-1). Default: 0.7 */
  quality?: number;
  /** File size threshold in bytes to trigger compression. Default: 2MB */
  sizeThreshold?: number;
};

export type CompressionResult = {
  /** The compressed (or original) file */
  file: File;
  /** Whether compression was applied */
  wasCompressed: boolean;
  /** Original file size in bytes */
  originalSize: number;
  /** Final file size in bytes */
  finalSize: number;
  /** Compression ratio (1.0 = no change, 0.5 = half size) */
  ratio: number;
};

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxDimension: 1920,
  quality: 0.7,
  sizeThreshold: 2 * 1024 * 1024, // 2MB
};

/**
 * Compress an image file for mobile upload.
 * Only compresses if the file exceeds the size threshold.
 * Uses canvas-based JPEG compression.
 *
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns CompressionResult with the (possibly compressed) file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  // Skip compression if under threshold
  if (originalSize <= opts.sizeThreshold) {
    return {
      file,
      wasCompressed: false,
      originalSize,
      finalSize: originalSize,
      ratio: 1.0,
    };
  }

  // Skip non-image files
  if (!file.type.startsWith("image/")) {
    return {
      file,
      wasCompressed: false,
      originalSize,
      finalSize: originalSize,
      ratio: 1.0,
    };
  }

  try {
    const compressedBlob = await compressImageBlob(file, opts);
    const compressedFile = new File([compressedBlob], file.name, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    return {
      file: compressedFile,
      wasCompressed: true,
      originalSize,
      finalSize: compressedFile.size,
      ratio: compressedFile.size / originalSize,
    };
  } catch {
    // If compression fails, return original file
    return {
      file,
      wasCompressed: false,
      originalSize,
      finalSize: originalSize,
      ratio: 1.0,
    };
  }
}

/**
 * Internal function to compress an image using canvas.
 */
async function compressImageBlob(
  file: File,
  opts: Required<CompressionOptions>
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = img;
        const maxDim = opts.maxDimension;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        // Create canvas and draw resized image
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create compressed blob"));
            }
          },
          "image/jpeg",
          opts.quality
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image for compression"));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
