import "dotenv/config";

const required = ["DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

let failed = false;

for (const key of required) {
  const value = process.env[key];
  const ok = typeof value === "string" && value.trim().length > 0;
  if (!ok) {
    failed = true;
  }
  console.log(`${ok ? "OK" : "MISSING"} ${key}`);
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log("Environment check passed.");
}
