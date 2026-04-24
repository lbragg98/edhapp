"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CompressionResult } from "@/modules/scanner/application/compress-image";
import { CameraStreamController } from "@/modules/scanner/camera/camera-stream-controller";
import { FrameSampler } from "@/modules/scanner/camera/frame-sampler";
import { mapCameraError } from "@/modules/scanner/domain/camera-capabilities";

export type LiveCameraStatus =
  | "idle"
  | "requesting-permission"
  | "camera-starting"
  | "camera-active"
  | "video-unavailable"
  | "permission-denied"
  | "unsupported-browser"
  | "error";

type CaptureSource = "live";
const GUIDE_WIDTH_RATIO = 0.65;
const GUIDE_HEIGHT_RATIO = 0.85;
const NAME_REGION_HEIGHT_RATIO = 0.2;
const MAX_CAPTURE_WIDTH = 900;

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

async function waitForNextFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function useLiveCameraScanner(input: {
  isScanning: boolean;
  intervalMs?: number;
  onFrame: (file: File, compressionResult: CompressionResult, source: CaptureSource) => void;
}) {
  const { isScanning, onFrame, intervalMs = 2_000 } = input;
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

  const cleanupStream = useCallback(() => {
    frameSamplerRef.current?.stop();
    frameSamplerRef.current = null;
    streamControllerRef.current?.stop();
    streamControllerRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    frameInFlightRef.current = false;
  }, []);

  const stop = useCallback(() => {
    console.info("[Scanner][camera] stop requested");
    cleanupStream();
    setStatus("idle");
  }, [cleanupStream]);

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

      const frameWidth = video.videoWidth;
      const frameHeight = video.videoHeight;
      const guideWidth = Math.floor(frameWidth * GUIDE_WIDTH_RATIO);
      const guideHeight = Math.floor(frameHeight * GUIDE_HEIGHT_RATIO);
      const guideLeft = Math.floor((frameWidth - guideWidth) / 2);
      const guideTop = Math.floor((frameHeight - guideHeight) / 2);

      const nameCropLeft = guideLeft;
      const nameCropTop = guideTop;
      const nameCropWidth = guideWidth;
      const nameCropHeight = Math.max(16, Math.floor(guideHeight * NAME_REGION_HEIGHT_RATIO));

      const outputWidth = Math.min(nameCropWidth, MAX_CAPTURE_WIDTH);
      const outputHeight = Math.max(16, Math.floor(nameCropHeight * (outputWidth / nameCropWidth)));

      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.drawImage(
        video,
        nameCropLeft,
        nameCropTop,
        nameCropWidth,
        nameCropHeight,
        0,
        0,
        outputWidth,
        outputHeight,
      );
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.82),
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

  const restartSampler = useCallback(() => {
    if (status !== "camera-active") {
      return;
    }
    frameSamplerRef.current?.stop();
    const sampler = new FrameSampler();
    sampler.start(sampleFrame, { intervalMs });
    frameSamplerRef.current = sampler;
  }, [intervalMs, sampleFrame, status]);

  const start = useCallback(async () => {
    console.info("[Scanner][camera] start button clicked");
    setLastError(null);

    if (typeof navigator === "undefined" || typeof window === "undefined") {
      console.warn("[Scanner][camera] navigator/window unavailable");
      setStatus("unsupported-browser");
      setLastError("Camera APIs are unavailable in this environment.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn("[Scanner][camera] mediaDevices.getUserMedia unsupported");
      setStatus("unsupported-browser");
      setLastError("This browser does not support camera capture.");
      return;
    }

    if (!canUseSecureCameraContext()) {
      console.warn("[Scanner][camera] insecure context");
      setStatus("unsupported-browser");
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
      setStatus("camera-starting");

      await waitForNextFrame();
      let video = videoRef.current;
      if (!video) {
        await waitForNextFrame();
        video = videoRef.current;
      }

      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        controller.stop();
        setStatus("video-unavailable");
        setLastError("Camera video element was not available.");
        return;
      }

      video.srcObject = stream;
      video.setAttribute("playsInline", "true");
      video.muted = true;
      await video.play();
      console.info("[Scanner][camera] video playing");

      streamControllerRef.current = controller;
      const sampler = new FrameSampler();
      sampler.start(sampleFrame, { intervalMs });
      frameSamplerRef.current = sampler;
      setStatus("camera-active");
    } catch (error) {
      const mapped = toFriendlyStartupError(error);
      console.error("[Scanner][camera] startup failed", {
        code: mapped.code,
        message: mapped.message,
      });
      if (mapped.code === "permission_denied") {
        setStatus("permission-denied");
      } else if (mapped.code === "not_supported" || mapped.code === "insecure_context") {
        setStatus("unsupported-browser");
      } else {
        setStatus("error");
      }
      setLastError(mapped.message);
      cleanupStream();
    }
  }, [cleanupStream, intervalMs, sampleFrame]);

  useEffect(() => () => stop(), [stop]);
  useEffect(() => {
    restartSampler();
  }, [intervalMs, restartSampler]);

  return {
    status,
    lastError,
    videoRef,
    canvasRef,
    start,
    stop,
    isActive: status === "camera-active",
  };
}
