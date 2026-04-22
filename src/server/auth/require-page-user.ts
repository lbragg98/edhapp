import { redirect } from "next/navigation";
import { resolveAppUserSession } from "@/server/auth/session-resolver";

export async function requirePageAppUser(nextPath: string) {
  const session = await resolveAppUserSession({ scope: "page", path: nextPath });
  if (session.status === "unauthenticated") {
    redirect(`/auth?next=${encodeURIComponent(nextPath)}`);
  }
  if (session.status === "provisioning_unavailable") {
    redirect(`/auth?next=${encodeURIComponent(nextPath)}&error=account_unavailable`);
  }
  return session.appUser;
}
