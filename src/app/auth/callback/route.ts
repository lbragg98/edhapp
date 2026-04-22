import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/auth";
import { prisma } from "@/server/db/prisma";

type OtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

function isOtpType(value: string | null): value is OtpType {
  return value === "signup"
    || value === "invite"
    || value === "magiclink"
    || value === "recovery"
    || value === "email_change"
    || value === "email";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next");
  const nextPath = next && next.startsWith("/") ? next : "/decks";

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    console.error("[Auth][callback] Supabase server client unavailable during callback.", {
      nextPath,
    });
    return NextResponse.redirect(new URL(`/auth?next=${encodeURIComponent(nextPath)}`, requestUrl.origin));
  }

  let authError: string | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error?.message ?? null;
  } else if (tokenHash && isOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    authError = error?.message ?? null;
  } else {
    authError = "Invalid or expired authentication callback.";
  }

  if (authError) {
    const isPkceVerifierError = authError.toLowerCase().includes("code verifier");
    console.error("[Auth][callback] Callback exchange failed.", {
      nextPath,
      authError,
      isPkceVerifierError,
      hadCode: Boolean(code),
      hadTokenHash: Boolean(tokenHash),
      type,
    });
    const authRedirect = new URL("/auth", requestUrl.origin);
    authRedirect.searchParams.set("next", nextPath);
    authRedirect.searchParams.set(
      "error",
      isPkceVerifierError
        ? "Secure sign-in session expired. Please request a new email link and open it in the same browser."
        : authError,
    );
    return NextResponse.redirect(authRedirect);
  }

  const { data: resolvedUserData } = await supabase.auth.getUser();
  const authUser = resolvedUserData.user;

  if (prisma && authUser) {
    const displayNameValue = authUser.user_metadata?.full_name
      ?? authUser.user_metadata?.name
      ?? authUser.user_metadata?.preferred_username;

    const displayName = typeof displayNameValue === "string" && displayNameValue.trim().length > 0
      ? displayNameValue.trim()
      : null;

    try {
      await prisma.appUser.upsert({
        where: { authUserId: authUser.id },
        update: {
          ...(authUser.email ? { email: authUser.email } : {}),
          ...(displayName ? { displayName } : {}),
        },
        create: {
          authUserId: authUser.id,
          email: authUser.email ?? null,
          displayName,
        },
      });
      console.info("[Auth][callback] AppUser upsert succeeded.", {
        authUserId: authUser.id,
        email: authUser.email ?? null,
      });
    } catch (error) {
      console.error("[Auth][callback] AppUser upsert failed.", {
        authUserId: authUser.id,
        email: authUser.email ?? null,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } else {
    console.warn("[Auth][callback] Skipped AppUser upsert.", {
      hasPrisma: Boolean(prisma),
      hasAuthUser: Boolean(authUser),
    });
  }

  console.info("[Auth][callback] Session established. Redirecting.", { nextPath });
  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
