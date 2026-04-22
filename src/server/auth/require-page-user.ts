import { redirect } from "next/navigation";
import { getAppUserIdentity } from "@/server/auth/auth-user";

export async function requirePageAppUser(nextPath: string) {
  const appUser = await getAppUserIdentity();

  if (!appUser) {
    redirect(`/auth?next=${encodeURIComponent(nextPath)}`);
  }

  return appUser;
}
