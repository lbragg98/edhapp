import { prisma } from "@/server/db/prisma";
import { createSupabaseServerClient } from "@/server/auth/supabase-server";

export type AuthIdentity = {
  authUserId: string;
  email: string | null;
  displayName: string | null;
};

export type AppUserIdentity = AuthIdentity & {
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

export async function getAuthIdentity(): Promise<AuthIdentity | null> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return {
    authUserId: data.user.id,
    email: data.user.email ?? null,
    displayName: toDisplayName(data.user.user_metadata),
  };
}

export async function getAppUserIdentity(): Promise<AppUserIdentity | null> {
  const identity = await getAuthIdentity();

  if (!identity || !prisma) {
    return null;
  }

  const appUser = await prisma.appUser.upsert({
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

  return {
    ...identity,
    appUserId: appUser.id,
  };
}
