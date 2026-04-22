import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/auth";

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
    console.error("[Auth][callback] Callback exchange failed.", {
      nextPath,
      authError,
      hadCode: Boolean(code),
      hadTokenHash: Boolean(tokenHash),
      type,
    });
    const authRedirect = new URL("/auth", requestUrl.origin);
    authRedirect.searchParams.set("next", nextPath);
    authRedirect.searchParams.set("error", authError);
    return NextResponse.redirect(authRedirect);
  }

  console.info("[Auth][callback] Session established. Redirecting.", { nextPath });
  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
