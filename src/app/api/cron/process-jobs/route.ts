import { runJobWorker } from "@/server/jobs/infrastructure/run-job-worker";

/**
 * Cron endpoint for processing background jobs.
 * Triggered by Vercel Cron to run every 5 minutes.
 *
 * Configure in vercel.json with:
 *   path: /api/cron/process-jobs
 *   schedule: every 5 minutes (standard cron syntax)
 */
export async function GET() {
  // Verify the request is from Vercel's cron service
  const authHeader = process.env.CRON_SECRET;
  const incomingSecret = new URL(process.env.VERCEL_URL || "").searchParams.get(
    "secret",
  );

  if (!authHeader || authHeader !== incomingSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await runJobWorker();

    return Response.json({
      success: true,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Jobs] Worker error:", message);

    return Response.json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
