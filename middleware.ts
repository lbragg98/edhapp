import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function withPathHeader(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-app-path", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = withPathHeader(request);

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = withPathHeader(request);

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const shouldLogDiagnostics =
    process.env.NEXT_PUBLIC_AUTH_DIAGNOSTICS === "true"
    || process.env.NODE_ENV === "development";
  const path = request.nextUrl.pathname;
  const isAuthRelevantPath = path.startsWith("/auth")
    || path.startsWith("/decks")
    || path.startsWith("/library")
    || path.startsWith("/scanner");

  // Keep Supabase session cookies fresh, but do not perform route gating here.
  // getUser() is the recommended SSR refresh path in middleware.
  const { data, error } = await supabase.auth.getUser();
  if (error && shouldLogDiagnostics && isAuthRelevantPath) {
    console.warn("[Auth][middleware] Session refresh failed.", {
      path,
      error: error.message,
    });
  } else if (shouldLogDiagnostics && isAuthRelevantPath) {
    console.info("[Auth][middleware] Session refresh evaluated.", {
      path,
      hasUser: Boolean(data.user),
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
