import { NextResponse } from "next/server";
import { getAppUserIdentity } from "@/server/auth/auth-user";

export async function requireApiAppUser() {
  const appUser = await getAppUserIdentity();

  if (!appUser) {
    return {
      appUser: null,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  return {
    appUser,
    response: null,
  };
}
