"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { cn } from "@/lib/utils";

type AuthMode = "magic_link" | "password";

export function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("magic_link");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const next = useMemo(() => {
    const raw = searchParams.get("next");
    return raw && raw.startsWith("/") ? raw : "/decks";
  }, [searchParams]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setError(null);
      setMessage(null);

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        setError("Supabase auth is not configured yet.");
        return;
      }

      if (mode === "magic_link") {
        const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
        const { error: authError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });

        if (authError) {
          setError(authError.message);
          return;
        }

        setMessage("Check your email for a secure sign-in link.");
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push(next);
      router.refresh();
    });
  }

  return (
    <section className="surface-panel mx-auto w-full max-w-md p-6 sm:p-7">
      <header className="space-y-2">
        <p className="type-label">Sign In</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Welcome to Command Tower</h1>
        <p className="text-sm text-[color:var(--text-subtle)]">Your decks, library, and workspace data stay private to your account.</p>
      </header>

      <div className="mt-5 inline-flex rounded-xl border border-white/12 bg-white/[0.02] p-1">
        <button
          type="button"
          onClick={() => setMode("magic_link")}
          className={cn("nav-link rounded-lg px-3 py-1.5", mode === "magic_link" && "nav-link-active")}
        >
          Magic Link
        </button>
        <button
          type="button"
          onClick={() => setMode("password")}
          className={cn("nav-link rounded-lg px-3 py-1.5", mode === "password" && "nav-link-active")}
        >
          Password
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block space-y-2">
          <span className="type-label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-xl border border-white/14 bg-white/[0.03] px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-white/30"
            placeholder="you@example.com"
          />
        </label>

        {mode === "password" ? (
          <label className="block space-y-2">
            <span className="type-label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-xl border border-white/14 bg-white/[0.03] px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-white/30"
              placeholder="Your password"
            />
          </label>
        ) : null}

        {message ? <p className="text-sm text-zinc-300">{message}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <button
          type="submit"
          disabled={isPending}
          className="nav-link nav-link-active inline-flex w-full items-center justify-center py-2.5 disabled:opacity-60"
        >
          {isPending ? "Working..." : mode === "magic_link" ? "Send Magic Link" : "Sign In"}
        </button>
      </form>
    </section>
  );
}
