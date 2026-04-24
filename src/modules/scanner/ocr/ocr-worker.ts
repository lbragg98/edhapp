import Tesseract from "tesseract.js";

const { createWorker, PSM } = Tesseract;

let workerPromise: ReturnType<typeof createWorker> | null = null;

export async function getSharedOcrWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("eng");
    const worker = await workerPromise;
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
    });
  }

  return workerPromise;
}

