"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Upload, AlertTriangle, RefreshCw, ImageIcon, Pause, Play } from "lucide-react";
import type { CameraCapabilities, CameraError } from "@/modules/scanner/domain/camera-capabilities";
import { compressImage, formatFileSize, type CompressionResult } from "@/modules/scanner/application/compress-image";
import { CameraStreamController } from "@/modules/scanner/camera/camera-stream-controller";
import { FrameSampler } from "@/modules/scanner/camera/frame-sampler";

type CaptureSource = "upload" | "capture" | "live";

type ScannerCaptureZoneProps = {
  onFileSelected: (file: File, compressionResult: CompressionResult, source: CaptureSource) => void;
  capabilities: CameraCapabilities | null;
  isDetecting: boolean;
  error: CameraError | null;
  onRequestPermission: () => Promise<boolean>;
  onRefresh: () => Promise<void>;
  isScanning: boolean;
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
  isScanning,
}: ScannerCaptureZoneProps) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);
  const [liveModeEnabled, setLiveModeEnabled] = useState(false);
  const [liveModeError, setLiveModeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamControllerRef = useRef<CameraStreamController | null>(null);
  const frameSamplerRef = useRef<FrameSampler | null>(null);
  const frameInFlightRef = useRef(false);

  const canUseLiveCamera = useMemo(
    () => Boolean(capabilities?.hasCamera && capabilities.supportsCapture),
    [capabilities],
  );

  const stopLiveMode = useCallback(() => {
    frameSamplerRef.current?.stop();
    frameSamplerRef.current = null;
    streamControllerRef.current?.stop();
    streamControllerRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    frameInFlightRef.current = false;
    setLiveModeEnabled(false);
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>, source: CaptureSource) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsCompressing(true);
      setCompressionInfo(null);

      try {
        const result = await compressImage(file);
        setCompressionInfo(result);
        onFileSelected(result.file, result, source);
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
        onFileSelected(file, fallbackResult, source);
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

  const sampleLiveFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || frameInFlightRef.current || isScanning) {
      return;
    }

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      return;
    }

    frameInFlightRef.current = true;
    try {
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.86),
      );

      if (!blob) {
        return;
      }

      const file = new File([blob], `live-scan-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const result: CompressionResult = {
        file,
        wasCompressed: false,
        originalSize: file.size,
        finalSize: file.size,
        ratio: 1,
      };
      onFileSelected(file, result, "live");
    } finally {
      frameInFlightRef.current = false;
    }
  }, [isScanning, onFileSelected]);

  const startLiveMode = useCallback(async () => {
    if (!canUseLiveCamera) {
      setLiveModeError("Live camera scanning is not available on this device.");
      return;
    }

    try {
      setLiveModeError(null);
      if (capabilities?.permissionState === "prompt") {
        const granted = await onRequestPermission();
        if (!granted) {
          setLiveModeError("Camera permission was not granted.");
          return;
        }
      }

      const controller = new CameraStreamController();
      const stream = await controller.start({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      if (!videoRef.current) {
        controller.stop();
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      streamControllerRef.current = controller;
      const sampler = new FrameSampler();
      sampler.start(sampleLiveFrame, { intervalMs: 900 });
      frameSamplerRef.current = sampler;
      setLiveModeEnabled(true);
    } catch (captureError) {
      setLiveModeError(
        captureError instanceof Error ? captureError.message : "Unable to start live scanner.",
      );
      stopLiveMode();
    }
  }, [canUseLiveCamera, capabilities, onRequestPermission, sampleLiveFrame, stopLiveMode]);

  useEffect(() => () => stopLiveMode(), [stopLiveMode]);

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
          onChange={(event) => void handleFileChange(event, "upload")}
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
          onChange={(event) => void handleFileChange(event, "upload")}
        />
      </div>
    );
  }

  return (
    <div className="surface-panel p-5 sm:p-6">
      <p className="type-label">Card Capture</p>

      {/* Capture Zone with Framing Guide */}
      <div className="mt-3 overflow-hidden rounded-xl border border-dashed border-[color:var(--surface-border-strong)] bg-white/[0.02]">
        <div className="relative aspect-[3/4] max-h-72">
          {liveModeEnabled ? (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              muted
              playsInline
              autoPlay
            />
          ) : null}
          <canvas ref={canvasRef} className="hidden" />
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
                ) : liveModeEnabled ? (
                  <div className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-200">
                    Live scanning active
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
          onClick={liveModeEnabled ? stopLiveMode : () => void startLiveMode()}
          disabled={isDetecting || isCompressing}
          className="nav-link nav-link-active flex-1 justify-center"
        >
          {liveModeEnabled ? (
            <>
              <Pause size={14} className="mr-1.5" />
              Stop Live Scan
            </>
          ) : (
            <>
              <Play size={14} className="mr-1.5" />
              Start Live Scan
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleCaptureClick}
          disabled={isDetecting || isCompressing || liveModeEnabled}
          className="nav-link"
        >
          <Camera size={14} className="mr-1.5" />
          Snap
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

      {liveModeError ? (
        <p className="mt-3 text-xs text-rose-300">{liveModeError}</p>
      ) : null}

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
        onChange={(event) => void handleFileChange(event, "capture")}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleFileChange(event, "upload")}
      />
    </div>
  );
}
