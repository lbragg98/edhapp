import { prisma } from "@/server/db/prisma";
import { createSupabaseServerClient } from "@/server/auth/supabase-server";
import { hasDatabaseUrl } from "@/server/config/env";

/**
 * Identity from Supabase authentication.
 * The `authUserId` is the Supabase user ID (UUID from auth.users).
 */
export type AuthIdentity = {
  /** Supabase auth user ID (UUID). Do NOT use for data ownership - use appUserId instead. */
  authUserId: string;
  email: string | null;
  displayName: string | null;
};

/**
 * Application user identity combining Supabase auth with internal user record.
 *
 * **Multi-User Data Isolation:**
 * - The `appUserId` is the internal database user ID (AppUser.id).
 * - All user-owned data (decks, library holdings) references `appUserId`, not `authUserId`.
 * - Always pass `appUserId` to repositories and services for proper data scoping.
 */
export type AppUserIdentity = AuthIdentity & {
  /** Internal application user ID. Use this for all data ownership references. */
  appUserId: string;
};

export type AppUserResolutionFailureReason =
  | "database_unavailable"
  | "app_user_resolution_failed";

export type AppUserResolutionResult =
  | { status: "resolved"; appUser: AppUserIdentity }
  | { status: "unavailable"; reason: AppUserResolutionFailureReason };

function toDisplayName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const value = (metadata as Record<string, unknown>).full_name
    ?? (metadata as Record<string, unknown>).name
    ?? (metadata as Record<string, unknown>).preferred_username;

  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function toAuthIdentityFromSupabaseUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: unknown;
}): AuthIdentity {
  return {
    authUserId: user.id,
    email: user.email ?? null,
    displayName: toDisplayName(user.user_metadata),
  };
}

/**
 * Retrieves the Supabase authentication identity from the current request.
 * Returns null if the user is not authenticated.
 */
export async function getAuthIdentity(): Promise<AuthIdentity | null> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (!error && data.user) {
    return toAuthIdentityFromSupabaseUser(data.user);
  }

  // Fallback for just-established sessions where getUser can briefly lag.
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData.session?.user;

  if (!sessionUser) {
    return null;
  }

  return toAuthIdentityFromSupabaseUser(sessionUser);
}

/**
 * Resolves the internal AppUser row from a known authenticated Supabase identity.
 * This must use the same auth identity for the whole request to avoid auth-read drift.
 */
export async function resolveAppUserIdentity(authIdentity: AuthIdentity): Promise<AppUserResolutionResult> {
  if (!prisma) {
    console.error("[Auth] Prisma client unavailable while resolving AppUser.", {
      authUserId: authIdentity.authUserId,
      email: authIdentity.email,
      hasDatabaseUrl,
      nodeEnv: process.env.NODE_ENV ?? "unknown",
    });
    return { status: "unavailable", reason: "database_unavailable" };
  }

  try {
    let appUser: { id: string };

    try {
      appUser = await prisma.appUser.upsert({
        where: { authUserId: authIdentity.authUserId },
        update: {
          ...(authIdentity.email ? { email: authIdentity.email } : {}),
          ...(authIdentity.displayName ? { displayName: authIdentity.displayName } : {}),
        },
        create: {
          authUserId: authIdentity.authUserId,
          email: authIdentity.email,
          displayName: authIdentity.displayName,
        },
        select: { id: true },
      });
    } catch (primaryError) {
      // Backward-compatible fallback for environments where authUserId mapping
      // has not been migrated yet but email-based user records exist.
      if (!authIdentity.email) {
        throw primaryError;
      }

      console.warn("[Auth] Falling back to email-based AppUser resolution.", {
        authUserId: authIdentity.authUserId,
        email: authIdentity.email,
        error: primaryError instanceof Error ? primaryError.message : "Unknown error",
      });

      appUser = await prisma.appUser.upsert({
        where: { email: authIdentity.email },
        update: {
          ...(authIdentity.displayName ? { displayName: authIdentity.displayName } : {}),
        },
        create: {
          email: authIdentity.email,
          displayName: authIdentity.displayName,
        },
        select: { id: true },
      });
    }

    return {
      status: "resolved",
      appUser: {
        ...authIdentity,
        appUserId: appUser.id,
      },
    };
  } catch (error) {
    console.error("[Auth] Failed to resolve AppUser identity.", {
      authUserId: authIdentity.authUserId,
      email: authIdentity.email,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return { status: "unavailable", reason: "app_user_resolution_failed" };
  }
}

/**
 * Retrieves or creates the application user identity for the current authenticated session.
 * When an identity is provided, the function avoids a second auth read to keep request state consistent.
 */
export async function getAppUserIdentity(identity?: AuthIdentity | null): Promise<AppUserIdentity | null> {
  const authIdentity = identity ?? await getAuthIdentity();

  if (!authIdentity) {
    return null;
  }

  const resolved = await resolveAppUserIdentity(authIdentity);
  if (resolved.status === "unavailable") {
    return null;
  }

  return resolved.appUser;
}
