"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type CameraCapabilities,
  type CameraError,
  type CameraPermissionState,
  detectCameraCapabilities,
  mapCameraError,
} from "@/modules/scanner/domain/camera-capabilities";

export type UseCameraPermissionsResult = {
  /** Current capabilities state */
  capabilities: CameraCapabilities | null;
  /** Whether capabilities are being detected */
  isDetecting: boolean;
  /** Last error that occurred */
  error: CameraError | null;
  /** Request camera permission (triggers browser prompt) */
  requestPermission: () => Promise<boolean>;
  /** Re-detect capabilities (useful after user changes settings) */
  refresh: () => Promise<void>;
  /** Whether camera is ready to use */
  isReady: boolean;
};

/**
 * Hook for managing camera permissions and capabilities.
 * Provides clean abstractions for permission detection, requesting, and error recovery.
 */
export function useCameraPermissions(): UseCameraPermissionsResult {
  const [capabilities, setCapabilities] = useState<CameraCapabilities | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const [error, setError] = useState<CameraError | null>(null);

  const refresh = useCallback(async () => {
    setIsDetecting(true);
    setError(null);
    try {
      const caps = await detectCameraCapabilities();
      setCapabilities(caps);
    } catch (err) {
      setError(mapCameraError(err));
    } finally {
      setIsDetecting(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function detectInitialCapabilities() {
      setIsDetecting(true);
      setError(null);
      try {
        const caps = await detectCameraCapabilities();
        if (isMounted) {
          setCapabilities(caps);
        }
      } catch (err) {
        if (isMounted) {
          setError(mapCameraError(err));
        }
      } finally {
        if (isMounted) {
          setIsDetecting(false);
        }
      }
    }

    void detectInitialCapabilities();

    // Listen for permission changes
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      let permissionStatus: PermissionStatus | null = null;

      navigator.permissions
        .query({ name: "camera" as PermissionName })
        .then((status) => {
          permissionStatus = status;
          status.onchange = () => {
            refresh();
          };
        })
        .catch(() => {
          // permissions API not available
        });

      return () => {
        isMounted = false;
        if (permissionStatus) {
          permissionStatus.onchange = null;
        }
      };
    }

    return () => {
      isMounted = false;
    };
  }, [refresh]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setError(null);

    if (!capabilities?.supportsMediaDevices) {
      setError({
        code: "not_supported",
        message: "Camera capture is not supported in this browser.",
        recoverable: false,
        suggestion: "Use file upload to select an image from your gallery.",
      });
      return false;
    }

    try {
      // Request permission by attempting to get a stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      // Immediately stop the stream - we just needed to trigger the permission prompt
      stream.getTracks().forEach((track) => track.stop());

      // Refresh capabilities to get updated permission state
      await refresh();

      return true;
    } catch (err) {
      const cameraError = mapCameraError(err);
      setError(cameraError);

      // Update permission state if it was denied
      if (cameraError.code === "permission_denied") {
        setCapabilities((prev) =>
          prev
            ? {
                ...prev,
                permissionState: "denied" as CameraPermissionState,
              }
            : null
        );
      }

      return false;
    }
  }, [capabilities, refresh]);

  const isReady =
    capabilities !== null &&
    capabilities.hasCamera &&
    capabilities.supportsCapture &&
    capabilities.permissionState !== "denied";

  return {
    capabilities,
    isDetecting,
    error,
    requestPermission,
    refresh,
    isReady,
  };
}
