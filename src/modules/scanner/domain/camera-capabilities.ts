/**
 * Camera capability detection and permission types.
 * These abstractions decouple permission logic from UI for clean retry flows.
 */

export type CameraPermissionState = "prompt" | "granted" | "denied" | "unavailable";

export type CameraCapabilities = {
  /** Whether the device has any camera */
  hasCamera: boolean;
  /** Whether the device has a rear-facing (environment) camera */
  hasRearCamera: boolean;
  /** Whether getUserMedia API is available */
  supportsMediaDevices: boolean;
  /** Whether file input with capture attribute is supported */
  supportsCapture: boolean;
  /** Current permission state */
  permissionState: CameraPermissionState;
};

export type CameraError = {
  code: "permission_denied" | "not_found" | "not_supported" | "overconstrained" | "unknown";
  message: string;
  recoverable: boolean;
  suggestion: string;
};

/**
 * Maps browser error names to our CameraError type.
 */
export function mapCameraError(error: unknown): CameraError {
  if (!(error instanceof Error)) {
    return {
      code: "unknown",
      message: "An unknown error occurred while accessing the camera.",
      recoverable: true,
      suggestion: "Try again or use file upload instead.",
    };
  }

  const name = error.name;
  const message = error.message;

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return {
      code: "permission_denied",
      message: "Camera access was denied.",
      recoverable: true,
      suggestion: "Allow camera access in your browser settings, then tap Retry.",
    };
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      code: "not_found",
      message: "No camera found on this device.",
      recoverable: false,
      suggestion: "Use file upload to select an image from your gallery.",
    };
  }

  if (name === "NotSupportedError" || name === "TypeError") {
    return {
      code: "not_supported",
      message: "Camera capture is not supported in this browser.",
      recoverable: false,
      suggestion: "Try using Safari on iOS or Chrome on Android.",
    };
  }

  if (name === "OverconstrainedError") {
    return {
      code: "overconstrained",
      message: "Camera settings could not be satisfied.",
      recoverable: true,
      suggestion: "Try again with different settings.",
    };
  }

  return {
    code: "unknown",
    message: message || "An error occurred while accessing the camera.",
    recoverable: true,
    suggestion: "Try again or use file upload instead.",
  };
}

/**
 * Detect camera capabilities on the current device.
 * Safe to call on server (returns unavailable state).
 */
export async function detectCameraCapabilities(): Promise<CameraCapabilities> {
  // Server-side or no window
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      hasCamera: false,
      hasRearCamera: false,
      supportsMediaDevices: false,
      supportsCapture: false,
      permissionState: "unavailable",
    };
  }

  const supportsMediaDevices = Boolean(navigator.mediaDevices?.getUserMedia);
  const supportsCapture = "capture" in document.createElement("input");

  // Check permission state if available
  let permissionState: CameraPermissionState = "prompt";
  try {
    if (navigator.permissions?.query) {
      const result = await navigator.permissions.query({ name: "camera" as PermissionName });
      permissionState = result.state as CameraPermissionState;
    }
  } catch {
    // permissions API not available, default to prompt
  }

  // Try to enumerate devices to check for cameras
  let hasCamera = false;
  let hasRearCamera = false;

  if (supportsMediaDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === "videoinput");
      hasCamera = cameras.length > 0;
      // Check for rear camera (usually labeled with 'back' or 'environment')
      hasRearCamera = cameras.some(
        (c) =>
          c.label.toLowerCase().includes("back") ||
          c.label.toLowerCase().includes("rear") ||
          c.label.toLowerCase().includes("environment")
      );
      // If no labels (permission not granted), assume rear camera exists on mobile
      if (hasCamera && !cameras.some((c) => c.label)) {
        hasRearCamera = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      }
    } catch {
      // Can't enumerate devices
    }
  }

  return {
    hasCamera,
    hasRearCamera,
    supportsMediaDevices,
    supportsCapture,
    permissionState,
  };
}
