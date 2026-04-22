import { getAppUserIdentity, getAuthIdentity, type AppUserIdentity, type AuthIdentity } from "@/server/auth/auth-user";

type SessionDiagnosticsContext = {
  scope: "protected-page" | "page" | "api";
  path?: string;
};

export type AppUserSessionResult =
  | { status: "authenticated"; authIdentity: AuthIdentity; appUser: AppUserIdentity }
  | { status: "unauthenticated" }
  | { status: "provisioning_unavailable"; authIdentity: AuthIdentity };

function diagnosticsPrefix(context: SessionDiagnosticsContext): string {
  return `[Auth][${context.scope}]${context.path ? ` ${context.path}` : ""}`;
}

export async function resolveAppUserSession(context: SessionDiagnosticsContext): Promise<AppUserSessionResult> {
  const authIdentity = await getAuthIdentity();

  if (!authIdentity) {
    console.warn(`${diagnosticsPrefix(context)} No authenticated Supabase session found.`);
    return { status: "unauthenticated" };
  }

  const appUser = await getAppUserIdentity();

  if (!appUser) {
    console.error(`${diagnosticsPrefix(context)} Supabase session exists but AppUser resolution failed.`, {
      authUserId: authIdentity.authUserId,
      email: authIdentity.email,
    });

    return {
      status: "provisioning_unavailable",
      authIdentity,
    };
  }

  return {
    status: "authenticated",
    authIdentity,
    appUser,
  };
}