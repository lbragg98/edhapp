export function buildEmailRedirectUrl(next: string): string {
  const explicitBaseUrl = process.env.NEXT_PUBLIC_AUTH_REDIRECT_BASE_URL
    ?? process.env.NEXT_PUBLIC_SITE_URL;

  const fallbackBaseUrl = window.location.origin;
  const baseUrl = explicitBaseUrl ?? fallbackBaseUrl;

  const redirect = new URL("/auth/callback", baseUrl);
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/decks";
  redirect.searchParams.set("next", nextPath);
  return redirect.toString();
}