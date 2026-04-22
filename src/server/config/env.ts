import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SCANNER_OCR_ENDPOINT: z.string().url().optional(),
  SCANNER_OCR_API_KEY: z.string().min(1).optional(),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  console.error("Invalid environment variables", parsedEnvironment.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsedEnvironment.data;
export const hasDatabaseUrl = Boolean(env.DATABASE_URL);
export const hasSupabaseAuthConfig = Boolean(
  env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
