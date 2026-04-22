import { redirect } from "next/navigation";
import { getAppUserIdentity, getAuthIdentity } from "@/server/auth/auth-user";

export async function requirePageAppUser(nextPath: string) {
  const authIdentity = await getAuthIdentity();

  if (!authIdentity) {
    redirect(`/auth?next=${encodeURIComponent(nextPath)}`);
  }

  let appUser = await getAppUserIdentity();

  if (!appUser) {
    // Brief retry to reduce false negatives right after callback/session refresh.
    await new Promise((resolve) => setTimeout(resolve, 50));
    appUser = await getAppUserIdentity();
  }

  if (!appUser) {
    throw new Error("Authenticated session found, but AppUser could not be resolved.");
  }

  return appUser;
}
