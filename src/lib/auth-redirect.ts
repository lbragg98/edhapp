export function buildEmailRedirectUrl(next: string): string {
  const runtimeOrigin = window.location.origin;
  const configuredBaseUrl = process.env.NEXT_PUBLIC_AUTH_REDIRECT_BASE_URL
    ?? process.env.NEXT_PUBLIC_SITE_URL
    ?? null;

  if (configuredBaseUrl) {
    try {
      const configuredOrigin = new URL(configuredBaseUrl).origin;
      if (configuredOrigin !== runtimeOrigin) {
        console.warn("[Auth] Ignoring cross-origin auth redirect base URL for PKCE safety.", {
          configuredOrigin,
          runtimeOrigin,
        });
      }
    } catch {
      console.warn("[Auth] Invalid configured auth redirect base URL; using runtime origin.");
    }
  }

  // PKCE verifier cookie must be created and consumed on the same origin.
  const redirect = new URL("/auth/callback", runtimeOrigin);
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/decks";
  redirect.searchParams.set("next", nextPath);
  return redirect.toString();
}
