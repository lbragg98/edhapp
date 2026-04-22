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

async function readProtectedPathFromHeaders(): Promise<string> {
  const headerStore = await headers();
  return parseProtectedNextPath(headerStore.get("x-app-path"));
}

const getCachedProtectedSession = cache(async () => {
  const path = await readProtectedPathFromHeaders();
  const session = await resolveAppUserSession({ scope: "protected-page", path });

  return {
    path,
    session,
  };
});

export async function requireProtectedPageSession() {
  const { path, session } = await getCachedProtectedSession();

  if (session.status === "unauthenticated") {
    redirect(`/auth?next=${encodeURIComponent(path)}`);
  }

  if (session.status === "provisioning_unavailable") {
    redirect(`/auth?next=${encodeURIComponent(path)}&error=account_unavailable`);
  }

  return session.appUser;
}

export async function getProtectedPageAppUser() {
  return requireProtectedPageSession();
}