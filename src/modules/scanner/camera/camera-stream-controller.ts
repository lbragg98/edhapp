export type CameraStreamState = "idle" | "starting" | "ready" | "error";

export class CameraStreamController {
  private stream: MediaStream | null = null;

  async start(constraints: MediaStreamConstraints = { video: { facingMode: "environment" }, audio: false }) {
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    return this.stream;
  }

  stop() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }

  getCurrentStream() {
    return this.stream;
  }
}

