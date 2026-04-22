import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const protectedPagePrefixes = ["/decks", "/library", "/scanner"];
const protectedApiPrefixes = ["/api/decks", "/api/library", "/api/scanner"];

function isProtectedPath(pathname: string) {
  return protectedPagePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isProtectedApi(pathname: string) {
  return protectedApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isLibraryScopedCardsPage(pathname: string, searchParams: URLSearchParams) {
  const isCardsPath = pathname === "/cards" || pathname.startsWith("/cards/");
  return isCardsPath && searchParams.get("pool") === "library";
}

function isLibraryScopedCardsApi(pathname: string, searchParams: URLSearchParams) {
  const isCardsApiPath = pathname === "/api/cards" || pathname.startsWith("/api/cards/");
  return isCardsApiPath && searchParams.get("pool") === "library";
}

function hasSupabaseAuthCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => {
    const name = cookie.name.toLowerCase();
    return name.includes("auth-token") || name.startsWith("sb-access-token") || name.startsWith("sb-refresh-token");
  });
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] | null = null;
  let authReadFailed = false;

  try {
    const {
      data: { user: resolvedUser },
    } = await supabase.auth.getUser();
    user = resolvedUser;
  } catch {
    authReadFailed = true;
    user = null;
  }

  const pathname = request.nextUrl.pathname;
  const isProtected = isProtectedPath(pathname)
    || isLibraryScopedCardsPage(pathname, request.nextUrl.searchParams);
  const isProtectedEndpoint = isProtectedApi(pathname)
    || isLibraryScopedCardsApi(pathname, request.nextUrl.searchParams);
  const hasAuthCookieHint = hasSupabaseAuthCookies(request);

  // If auth lookup temporarily fails but auth cookies exist, let downstream
  // server checks resolve session state to avoid false sign-in redirects.
  if (!user && authReadFailed && hasAuthCookieHint) {
    return response;
  }

  if (!user && hasAuthCookieHint) {
    return response;
  }

  if (!user && isProtectedEndpoint) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.search = `?next=${encodeURIComponent(`${pathname}${request.nextUrl.search}`)}`;
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/decks/:path*",
    "/library/:path*",
    "/scanner/:path*",
    "/cards/:path*",
    "/api/decks/:path*",
    "/api/library/:path*",
    "/api/scanner/:path*",
    "/api/cards/:path*",
  ],
};
