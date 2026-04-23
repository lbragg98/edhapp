import {
  getAuthIdentity,
  resolveAppUserIdentity,
  type AppUserIdentity,
  type AuthIdentity,
  type AppUserResolutionFailureReason,
} from "@/server/auth/auth-user";

type SessionDiagnosticsContext = {
  scope: "protected-page" | "page" | "api";
  path?: string;
};

export type AppUserSessionResult =
  | { status: "authenticated"; authIdentity: AuthIdentity; appUser: AppUserIdentity }
  | { status: "unauthenticated" }
  | {
      status: "provisioning_unavailable";
      authIdentity: AuthIdentity;
      reason: AppUserResolutionFailureReason;
    };

function diagnosticsPrefix(context: SessionDiagnosticsContext): string {
  return `[Auth][${context.scope}]${context.path ? ` ${context.path}` : ""}`;
}

export async function resolveAppUserSession(context: SessionDiagnosticsContext): Promise<AppUserSessionResult> {
  const authIdentity = await getAuthIdentity();

  if (!authIdentity) {
    console.warn(`${diagnosticsPrefix(context)} No authenticated Supabase session found.`);
    return { status: "unauthenticated" };
  }

  const appUserResolution = await resolveAppUserIdentity(authIdentity);

  if (appUserResolution.status === "unavailable") {
    console.error(`${diagnosticsPrefix(context)} Supabase session exists but AppUser resolution failed.`, {
      authUserId: authIdentity.authUserId,
      email: authIdentity.email,
      reason: appUserResolution.reason,
    });

    return {
      status: "provisioning_unavailable",
      authIdentity,
      reason: appUserResolution.reason,
    };
  }

  return {
    status: "authenticated",
    authIdentity,
    appUser: appUserResolution.appUser,
  };
}
