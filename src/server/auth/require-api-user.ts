import { NextResponse } from "next/server";
import { getAppUserIdentity } from "@/server/auth/auth-user";

/**
 * Requires authenticated user for API route handlers.
 *
 * **Usage in API Routes:**
 * ```ts
 * export async function GET() {
 *   const auth = await requireApiAppUser();
 *   if (auth.response) return auth.response; // Returns 401 if not authenticated
 *
 *   // auth.appUser.appUserId is now guaranteed to be available
 *   const service = createDeckService(auth.appUser.appUserId);
 *   // ...
 * }
 * ```
 *
 * **Security Guarantees:**
 * - Returns 401 JSON response if user is not authenticated.
 * - The `appUserId` returned is the internal database user ID, not the Supabase auth ID.
 * - All service/repository instantiation should use this ID for user-scoped operations.
 */
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
