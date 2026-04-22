"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

const navItems = [
  { label: "Cards", href: "/cards" },
  { label: "Scanner", href: "/scanner" },
  { label: "Library", href: "/library" },
  { label: "Decks", href: "/decks" },
  { label: "Tracker", href: "/tracker" },
] as const;

type TopNavProps = {
  viewerLabel?: string | null;
  isAuthenticated?: boolean;
};

export function TopNav({ viewerLabel, isAuthenticated }: TopNavProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      await supabase.auth.signOut();
      window.location.href = "/auth";
    });
  }

  return (
    <header className="surface-panel sticky top-4 z-20 mb-10 px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/[0.04] text-xs font-semibold tracking-[0.14em] text-zinc-100">
            CT
          </span>
          <div>
            <p className="type-label">Commander Platform</p>
            <p className="text-sm font-medium tracking-tight text-zinc-100">Command Tower</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1.5" aria-label="Primary navigation">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn("nav-link", isActive && "nav-link-active")}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="nav-link"
              disabled={isPending}
              title={viewerLabel ?? "Signed in"}
            >
              {isPending ? "Signing out..." : "Sign Out"}
            </button>
          ) : (
            <Link href="/auth" className="nav-link">
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
