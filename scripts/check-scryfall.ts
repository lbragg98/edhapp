import "dotenv/config";
import { runScryfallMatchCheck } from "../src/server/dev/diagnostics-checks";

async function main() {
  const query = process.argv[2] ?? "Mana Geyser";
  const result = await runScryfallMatchCheck(query);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

void main();
