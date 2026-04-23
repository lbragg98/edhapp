import { redirect } from "next/navigation";
import { resolveAppUserSession } from "@/server/auth/session-resolver";

export async function requirePageAppUser(nextPath: string) {
  const session = await resolveAppUserSession({ scope: "page", path: nextPath });
  if (session.status === "unauthenticated") {
    redirect(`/auth?next=${encodeURIComponent(nextPath)}`);
  }
  if (session.status === "provisioning_unavailable") {
    console.error("[Auth][page] Authenticated page request blocked because AppUser provisioning failed.", {
      path: nextPath,
      authUserId: session.authIdentity.authUserId,
      email: session.authIdentity.email,
      reason: session.reason,
    });
    redirect(`/auth?next=${encodeURIComponent(nextPath)}&error=account_unavailable`);
  }
  return session.appUser;
}
