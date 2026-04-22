"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Upload, AlertTriangle, RefreshCw, ImageIcon } from "lucide-react";
import type { CameraCapabilities, CameraError } from "@/modules/scanner/domain/camera-capabilities";
import { compressImage, formatFileSize, type CompressionResult } from "@/modules/scanner/application/compress-image";

type ScannerCaptureZoneProps = {
  onFileSelected: (file: File, compressionResult: CompressionResult) => void;
  capabilities: CameraCapabilities | null;
  isDetecting: boolean;
  error: CameraError | null;
  onRequestPermission: () => Promise<boolean>;
  onRefresh: () => Promise<void>;
};

/**
 * Mobile-optimized capture zone with framing guidance, permission handling,
 * and compression feedback.
 */
export function ScannerCaptureZone({
  onFileSelected,
  capabilities,
  isDetecting,
  error,
  onRequestPermission,
  onRefresh,
}: ScannerCaptureZoneProps) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsCompressing(true);
      setCompressionInfo(null);

      try {
        const result = await compressImage(file);
        setCompressionInfo(result);
        onFileSelected(result.file, result);
      } catch {
        // If compression fails, use original
        const fallbackResult: CompressionResult = {
          file,
          wasCompressed: false,
          originalSize: file.size,
          finalSize: file.size,
          ratio: 1.0,
        };
        setCompressionInfo(fallbackResult);
        onFileSelected(file, fallbackResult);
      } finally {
        setIsCompressing(false);
      }

      // Reset input so same file can be selected again
      event.target.value = "";
    },
    [onFileSelected]
  );

  const handleCaptureClick = useCallback(() => {
    if (capabilities?.permissionState === "denied") {
      // Can't capture, show error
      return;
    }

    if (capabilities?.permissionState === "prompt") {
      void onRequestPermission();
    }

    captureInputRef.current?.click();
  }, [capabilities, onRequestPermission]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Permission denied state
  if (error?.code === "permission_denied" || capabilities?.permissionState === "denied") {
    return (
      <div className="surface-panel p-5 sm:p-6">
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
            <AlertTriangle size={28} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-100">Camera Access Denied</p>
            <p className="mt-1 text-sm text-[color:var(--text-subtle)]">
              {error?.suggestion || "Allow camera access in your browser settings to capture cards."}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={onRefresh} className="nav-link">
              <RefreshCw size={14} className="mr-1.5" />
              Check Again
            </button>
            <button type="button" onClick={handleUploadClick} className="nav-link nav-link-active">
              <Upload size={14} className="mr-1.5" />
              Upload Instead
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  // Camera not available state
  if (capabilities && !capabilities.hasCamera && !capabilities.supportsCapture) {
    return (
      <div className="surface-panel p-5 sm:p-6">
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-500/10">
            <ImageIcon size={28} className="text-zinc-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-100">No Camera Available</p>
            <p className="mt-1 text-sm text-[color:var(--text-subtle)]">
              Use file upload to select card images from your device.
            </p>
          </div>
          <button type="button" onClick={handleUploadClick} className="nav-link nav-link-active">
            <Upload size={14} className="mr-1.5" />
            Upload Image
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  return (
    <div className="surface-panel p-5 sm:p-6">
      <p className="type-label">Card Capture</p>

      {/* Capture Zone with Framing Guide */}
      <div className="mt-3 overflow-hidden rounded-xl border border-dashed border-[color:var(--surface-border-strong)] bg-white/[0.02]">
        {/* Framing overlay hint */}
        <div className="relative aspect-[3/4] max-h-72">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Card frame guide */}
            <div className="relative h-[85%] w-[65%]">
              {/* Corner markers */}
              <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-zinc-500/50 rounded-tl" />
              <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-zinc-500/50 rounded-tr" />
              <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-zinc-500/50 rounded-bl" />
              <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-zinc-500/50 rounded-br" />
              
              {/* Center content */}
              <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                {isDetecting ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <RefreshCw size={16} className="animate-spin" />
                    Detecting camera...
                  </div>
                ) : isCompressing ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <RefreshCw size={16} className="animate-spin" />
                    Optimizing image...
                  </div>
                ) : (
                  <>
                    <Camera size={32} className="text-zinc-500" />
                    <p className="text-sm text-zinc-400">
                      Align card within frame
                    </p>
                    <p className="text-xs text-zinc-500">
                      Name and type should be clearly visible
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleCaptureClick}
          disabled={isDetecting || isCompressing}
          className="nav-link nav-link-active flex-1 justify-center"
        >
          <Camera size={14} className="mr-1.5" />
          {capabilities?.hasRearCamera ? "Capture Card" : "Take Photo"}
        </button>
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={isCompressing}
          className="nav-link"
        >
          <Upload size={14} className="mr-1.5" />
          Upload
        </button>
      </div>

      {/* Compression feedback */}
      {compressionInfo?.wasCompressed && (
        <p className="mt-3 text-xs text-[color:var(--text-subtle)]">
          Image optimized: {formatFileSize(compressionInfo.originalSize)} →{" "}
          {formatFileSize(compressionInfo.finalSize)} ({Math.round((1 - compressionInfo.ratio) * 100)}% smaller)
        </p>
      )}

      {/* Capture tips */}
      <div className="mt-4 space-y-1">
        <p className="text-xs text-[color:var(--text-subtle)]">Tips for best results:</p>
        <ul className="list-inside list-disc space-y-0.5 text-xs text-zinc-500">
          <li>Use good lighting, avoid glare</li>
          <li>Hold steady, card should fill frame</li>
          <li>Card name must be readable</li>
        </ul>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={captureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
