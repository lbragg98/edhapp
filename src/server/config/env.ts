import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_AUTH_REDIRECT_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SCANNER_OCR_ENDPOINT: z.string().url().optional(),
  SCANNER_OCR_API_KEY: z.string().min(1).optional(),
  OCR_PROVIDER: z.enum(["browser", "server", "disabled"]).optional(),
  SCANNER_TESSERACT_LANG_PATH: z.string().min(1).optional(),
  SCANNER_TESSERACT_CORE_PATH: z.string().min(1).optional(),
  SCANNER_TESSERACT_WORKER_PATH: z.string().min(1).optional(),
  SCANNER_TESSERACT_CACHE_PATH: z.string().min(1).optional(),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  console.error("Invalid environment variables", parsedEnvironment.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsedEnvironment.data;
export const hasDatabaseUrl = Boolean(env.DATABASE_URL);
export const hasDirectUrl = Boolean(env.DIRECT_URL);
export const missingPrismaEnvVars = [
  ...(hasDatabaseUrl ? [] : ["DATABASE_URL"]),
  ...(hasDirectUrl ? [] : ["DIRECT_URL"]),
] as const;
export const hasRequiredPrismaEnv = missingPrismaEnvVars.length === 0;
export const hasSupabaseAuthConfig = Boolean(
  env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const legacyPrismaEnvVars = ["POSTGRES_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING"] as const;
const presentLegacyPrismaEnvVars = legacyPrismaEnvVars.filter((name) => {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
});

if (presentLegacyPrismaEnvVars.length > 0) {
  console.warn(
    `[Env] Ignoring legacy Postgres env vars: ${presentLegacyPrismaEnvVars.join(", ")}. ` +
      "Prisma only uses DATABASE_URL (runtime) and DIRECT_URL (migrations).",
  );
}

if (!hasRequiredPrismaEnv) {
  const message =
    `[Env] Missing required Prisma env vars: ${missingPrismaEnvVars.join(", ")}. ` +
    "Set DATABASE_URL (runtime pooled URL) and DIRECT_URL (direct migration URL).";

  if (env.NODE_ENV === "production") {
    throw new Error(message);
  }

  console.error(message);
}
