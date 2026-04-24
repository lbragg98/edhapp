import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { env } from "@/server/config/env";
import { resolveAppUserSession } from "@/server/auth/session-resolver";

type DiagnosticsAccess =
  | { ok: true }
  | { ok: false; response: NextResponse };

export function requireDiagnosticsAccess(request: Request): DiagnosticsAccess {
  const isProduction = env.NODE_ENV === "production";
  const configuredKey = env.DEV_DIAGNOSTICS_KEY?.trim();

  if (!isProduction) {
    return { ok: true };
  }

  if (!configuredKey) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Diagnostics disabled." }, { status: 404 }),
    };
  }

  const providedKey = request.headers.get("x-dev-diagnostics-key")?.trim();
  if (!providedKey || providedKey !== configuredKey) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Diagnostics key required." }, { status: 401 }),
    };
  }

  return { ok: true };
}

export async function resolveDiagnosticsUserId(): Promise<{
  userId: string | null;
  source: "session" | "dev_user" | "none";
  sessionStatus: "authenticated" | "unauthenticated" | "provisioning_unavailable";
}> {
  const session = await resolveAppUserSession({ scope: "api" });
  if (session.status === "authenticated") {
    return {
      userId: session.appUser.appUserId,
      source: "session",
      sessionStatus: "authenticated",
    };
  }

  if (!prisma) {
    return {
      userId: null,
      source: "none",
      sessionStatus: session.status,
    };
  }

  const devUser = await prisma.appUser.upsert({
    where: { email: "dev-diagnostics@local.test" },
    update: { displayName: "Dev Diagnostics User" },
    create: {
      email: "dev-diagnostics@local.test",
      displayName: "Dev Diagnostics User",
      authUserId: null,
    },
    select: { id: true },
  });

  return {
    userId: devUser.id,
    source: "dev_user",
    sessionStatus: session.status,
  };
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, code: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(code)), timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

