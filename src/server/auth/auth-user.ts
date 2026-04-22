import { prisma } from "@/server/db/prisma";
import { createSupabaseServerClient } from "@/server/auth/supabase-server";

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

function toDisplayName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const value = (metadata as Record<string, unknown>).full_name
    ?? (metadata as Record<string, unknown>).name
    ?? (metadata as Record<string, unknown>).preferred_username;

  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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
    return {
      authUserId: data.user.id,
      email: data.user.email ?? null,
      displayName: toDisplayName(data.user.user_metadata),
    };
  }

  // Fallback for just-established sessions where getUser can briefly lag.
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData.session?.user;

  if (!sessionUser) {
    return null;
  }

  return {
    authUserId: sessionUser.id,
    email: sessionUser.email ?? null,
    displayName: toDisplayName(sessionUser.user_metadata),
  };
}

/**
 * Retrieves or creates the application user identity for the current authenticated session.
 *
 * **Upsert Behavior:**
 * - If the AppUser exists (by authUserId), updates email/displayName if changed.
 * - If the AppUser does not exist, creates a new record.
 *
 * **Multi-User Guarantee:**
 * - Each Supabase auth user maps to exactly one AppUser.
 * - The returned `appUserId` should be passed to all services/repositories for data scoping.
 *
 * @returns AppUserIdentity if authenticated, null otherwise.
 */
export async function getAppUserIdentity(): Promise<AppUserIdentity | null> {
  const identity = await getAuthIdentity();

  if (!identity || !prisma) {
    return null;
  }

  try {
    let appUser: { id: string };

    try {
      appUser = await prisma.appUser.upsert({
        where: { authUserId: identity.authUserId },
        update: {
          ...(identity.email ? { email: identity.email } : {}),
          ...(identity.displayName ? { displayName: identity.displayName } : {}),
        },
        create: {
          authUserId: identity.authUserId,
          email: identity.email,
          displayName: identity.displayName,
        },
        select: { id: true },
      });
    } catch (primaryError) {
      // Backward-compatible fallback for environments where authUserId mapping
      // has not been migrated yet but email-based user records exist.
      if (!identity.email) {
        throw primaryError;
      }

      console.warn("[Auth] Falling back to email-based AppUser resolution.", {
        authUserId: identity.authUserId,
        email: identity.email,
        error: primaryError instanceof Error ? primaryError.message : "Unknown error",
      });

      appUser = await prisma.appUser.upsert({
        where: { email: identity.email },
        update: {
          ...(identity.displayName ? { displayName: identity.displayName } : {}),
        },
        create: {
          email: identity.email,
          displayName: identity.displayName,
        },
        select: { id: true },
      });
    }

    return {
      ...identity,
      appUserId: appUser.id,
    };
  } catch (error) {
    console.error("[Auth] Failed to resolve AppUser identity.", {
      authUserId: identity.authUserId,
      email: identity.email,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}
