import "dotenv/config";
import { runOcrCheck } from "../src/server/dev/diagnostics-checks";
import { shutdownSharedOcrWorker } from "../src/modules/scanner/ocr/ocr-worker";

async function main() {
  try {
    const result = await runOcrCheck();
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) {
      process.exitCode = 1;
    }
  } finally {
    await shutdownSharedOcrWorker();
  }
}

void main();
