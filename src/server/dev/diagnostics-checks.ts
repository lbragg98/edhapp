import { prisma } from "@/server/db/prisma";
import { hasRequiredPrismaEnv, missingPrismaEnvVars } from "@/server/config/env";
import { getScannerOcrRuntimeStatus } from "@/modules/scanner/application/services";
import { resolveCardCandidate } from "@/modules/scanner/recognition/resolve-card-candidate";
import { withTimeout } from "@/server/dev/diagnostics-access";

export async function runDbCheck() {
  if (!prisma) {
    return {
      ok: false,
      error: "Prisma client unavailable.",
      hasRequiredPrismaEnv,
      missingPrismaEnvVars,
    };
  }

  try {
    const startedAt = Date.now();
    const ping = await withTimeout(
      prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 as ok`,
      5_000,
      "DB_PING_TIMEOUT",
    );
    const migrationTableExists = await withTimeout(
      prisma.$queryRaw<Array<{ exists: string | null }>>`SELECT to_regclass('public."_prisma_migrations"')::text as exists`,
      5_000,
      "DB_MIGRATIONS_TABLE_LOOKUP_TIMEOUT",
    );
    const hasMigrationsTable = Boolean(migrationTableExists[0]?.exists);

    const migrations = hasMigrationsTable
      ? await withTimeout(
          prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
            SELECT migration_name, finished_at
            FROM "_prisma_migrations"
            ORDER BY finished_at DESC NULLS LAST
            LIMIT 5
          `,
          5_000,
          "DB_MIGRATIONS_TIMEOUT",
        )
      : [];
    const tables = await withTimeout(
      prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `,
      5_000,
      "DB_TABLES_TIMEOUT",
    );

    const requiredTables = [
      "AppUser",
      "Deck",
      "DeckCardEntry",
      "CollectionEntry",
      "CollectionHolding",
      "Card",
      "CardPrinting",
    ];
    const existing = new Set(tables.map((table) => table.table_name));
    const missingTables = requiredTables.filter((name) => !existing.has(name));

    return {
      ok: ping[0]?.ok === 1 && missingTables.length === 0,
      durationMs: Date.now() - startedAt,
      missingTables,
      migrationCount: migrations.length,
      latestMigration: migrations[0]?.migration_name ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Database diagnostics failed.",
    };
  }
}

export async function runOcrCheck() {
  const startedAt = Date.now();
  try {
    const status = await withTimeout(getScannerOcrRuntimeStatus(), 15_000, "OCR_STATUS_TIMEOUT");
    return {
      ok: status.ready,
      durationMs: Date.now() - startedAt,
      status,
    };
  } catch (error) {
    return {
      ok: false,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "OCR diagnostics failed.",
    };
  }
}

export async function runScryfallMatchCheck(text: string) {
  const startedAt = Date.now();
  const result = await withTimeout(
    resolveCardCandidate({
      extractedText: text,
      extractionConfidence: 0.82,
    }),
    15_000,
    "SCRYFALL_MATCH_TIMEOUT",
  );

  return {
    ok: result.candidates.length > 0,
    durationMs: Date.now() - startedAt,
    normalizedQuery: result.normalizedQuery,
    status: result.status,
    topCandidate: result.candidates[0]
      ? {
          name: result.candidates[0].card.name,
          confidence: result.candidates[0].confidence,
          reasons: result.candidates[0].reasons,
        }
      : null,
    candidates: result.candidates.slice(0, 5).map((candidate) => ({
      name: candidate.card.name,
      confidence: candidate.confidence,
      reasons: candidate.reasons,
    })),
  };
}
