import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveAppUserSession } from "@/server/auth/session-resolver";

function parseProtectedNextPath(value: string | null): string {
  if (!value || !value.startsWith("/")) {
    return "/decks";
  }

  return value;
}

const getCachedProtectedSession = cache(async (path: string, requestFingerprint: string | null) => {
  const session = await resolveAppUserSession({ scope: "protected-page", path });

  return {
    path,
    requestFingerprint,
    session,
  };
});

export async function requireProtectedPageSession() {
  const headerStore = await headers();
  const path = parseProtectedNextPath(headerStore.get("x-app-path"));
  const requestFingerprint = headerStore.get("cookie");
  const { session } = await getCachedProtectedSession(path, requestFingerprint);

  if (session.status === "unauthenticated") {
    console.warn("[Auth][protected-page] Redirecting unauthenticated request.", { path });
    redirect(`/auth?next=${encodeURIComponent(path)}`);
  }

  if (session.status === "provisioning_unavailable") {
    console.error("[Auth][protected-page] Authenticated request blocked because AppUser provisioning failed.", {
      path,
      authUserId: session.authIdentity.authUserId,
      email: session.authIdentity.email,
      reason: session.reason,
    });
    redirect(`/auth?next=${encodeURIComponent(path)}&error=account_unavailable`);
  }

  return session.appUser;
}

export async function getProtectedPageAppUser() {
  return requireProtectedPageSession();
}
