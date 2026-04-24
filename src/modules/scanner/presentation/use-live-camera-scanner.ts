"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CompressionResult } from "@/modules/scanner/application/compress-image";
import { CameraStreamController } from "@/modules/scanner/camera/camera-stream-controller";
import { FrameSampler } from "@/modules/scanner/camera/frame-sampler";
import { mapCameraError } from "@/modules/scanner/domain/camera-capabilities";

export type LiveCameraStatus =
  | "idle"
  | "requesting-permission"
  | "active"
  | "denied"
  | "unavailable"
  | "error";

type CaptureSource = "live";

function canUseSecureCameraContext(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.isSecureContext) {
    return true;
  }

  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function toFriendlyStartupError(error: unknown): { code: string; message: string } {
  const mapped = mapCameraError(error);
  return {
    code: mapped.code,
    message: mapped.message,
  };
}

export function useLiveCameraScanner(input: {
  isScanning: boolean;
  intervalMs?: number;
  onFrame: (file: File, compressionResult: CompressionResult, source: CaptureSource) => void;
}) {
  const { isScanning, onFrame, intervalMs = 900 } = input;
  const [status, setStatus] = useState<LiveCameraStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamControllerRef = useRef<CameraStreamController | null>(null);
  const frameSamplerRef = useRef<FrameSampler | null>(null);
  const frameInFlightRef = useRef(false);
  const isScanningRef = useRef(isScanning);

  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  const stop = useCallback(() => {
    console.info("[Scanner][camera] stop requested");
    frameSamplerRef.current?.stop();
    frameSamplerRef.current = null;
    streamControllerRef.current?.stop();
    streamControllerRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    frameInFlightRef.current = false;
    setStatus("idle");
  }, []);

  const sampleFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || frameInFlightRef.current || isScanningRef.current) {
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
      onFrame(file, result, "live");
    } finally {
      frameInFlightRef.current = false;
    }
  }, [onFrame]);

  const start = useCallback(async () => {
    console.info("[Scanner][camera] start button clicked");
    setLastError(null);

    if (typeof navigator === "undefined" || typeof window === "undefined") {
      console.warn("[Scanner][camera] navigator/window unavailable");
      setStatus("unavailable");
      setLastError("Camera APIs are unavailable in this environment.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn("[Scanner][camera] mediaDevices.getUserMedia unsupported");
      setStatus("unavailable");
      setLastError("This browser does not support camera capture.");
      return;
    }

    if (!canUseSecureCameraContext()) {
      console.warn("[Scanner][camera] insecure context");
      setStatus("unavailable");
      setLastError("Camera requires HTTPS (or localhost).");
      return;
    }

    try {
      setStatus("requesting-permission");
      console.info("[Scanner][camera] requesting getUserMedia");

      const controller = new CameraStreamController();
      const stream = await controller.start({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });
      console.info("[Scanner][camera] stream received");

      if (!videoRef.current) {
        controller.stop();
        setStatus("error");
        setLastError("Camera video element was not available.");
        return;
      }

      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute("playsInline", "true");
      videoRef.current.muted = true;
      await videoRef.current.play();
      console.info("[Scanner][camera] video playing");

      streamControllerRef.current = controller;
      const sampler = new FrameSampler();
      sampler.start(sampleFrame, { intervalMs });
      frameSamplerRef.current = sampler;
      setStatus("active");
    } catch (error) {
      const mapped = toFriendlyStartupError(error);
      console.error("[Scanner][camera] startup failed", {
        code: mapped.code,
        message: mapped.message,
      });
      if (mapped.code === "permission_denied") {
        setStatus("denied");
      } else if (mapped.code === "not_supported" || mapped.code === "insecure_context") {
        setStatus("unavailable");
      } else {
        setStatus("error");
      }
      setLastError(mapped.message);
      stop();
    }
  }, [intervalMs, sampleFrame, stop]);

  useEffect(() => () => stop(), [stop]);

  return {
    status,
    lastError,
    videoRef,
    canvasRef,
    start,
    stop,
    isActive: status === "active",
  };
}

