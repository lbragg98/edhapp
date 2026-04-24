import "dotenv/config";
import { runDbCheck } from "../src/server/dev/diagnostics-checks";

async function main() {
  const result = await runDbCheck();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

void main();
