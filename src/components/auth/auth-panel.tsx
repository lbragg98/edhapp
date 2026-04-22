"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { cn } from "@/lib/utils";

type AuthMode = "magic_link" | "password";
type PasswordSubmode = "sign_in" | "sign_up";

function buildEmailRedirectUrl(next: string): string {
  const explicitBaseUrl = process.env.NEXT_PUBLIC_AUTH_REDIRECT_BASE_URL
    ?? process.env.NEXT_PUBLIC_SITE_URL
    ?? process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL;

  const isLocalHostOrigin = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const fallbackBaseUrl = isLocalHostOrigin ? window.location.origin : "https://v0-edhapp.vercel.app";
  const baseUrl = explicitBaseUrl ?? fallbackBaseUrl;

  const redirect = new URL("/auth/callback", baseUrl);
  redirect.searchParams.set("next", next);
  return redirect.toString();
}

export function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("magic_link");
  const [passwordSubmode, setPasswordSubmode] = useState<PasswordSubmode>("sign_in");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const next = useMemo(() => {
    const raw = searchParams.get("next");
    return raw && raw.startsWith("/") ? raw : "/decks";
  }, [searchParams]);

  const callbackError = useMemo(() => {
    const raw = searchParams.get("error");
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  }, [searchParams]);

  function switchMode(newMode: AuthMode) {
    setMode(newMode);
    setError(null);
    setMessage(null);
  }

  function switchPasswordSubmode(submode: PasswordSubmode) {
    setPasswordSubmode(submode);
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setMessage(null);
  }

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
        const redirectTo = buildEmailRedirectUrl(next);
        const { error: authError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });

        if (authError) {
          setError(authError.message);
          return;
        }

        setMessage("Check your email for a secure sign-in link.");
        return;
      }

      // Password sign-up
      if (passwordSubmode === "sign_up") {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }

        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          return;
        }

        const redirectTo = buildEmailRedirectUrl(next);

        const { data: signUpData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });

        if (authError) {
          setError(authError.message);
          return;
        }

        const { error: resendError } = await supabase.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: redirectTo },
        });

        if (resendError) {
          if (signUpData.session) {
            setMessage("Account created and signed in. Enable email confirmation in Supabase Auth settings if you require verification emails.");
            router.push(next);
            router.refresh();
            return;
          }

          setError(resendError.message);
          return;
        }

        setMessage("Account created. Check your email to confirm before signing in.");
        return;
      }

      // Password sign-in
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push(next);
      router.refresh();
    });
  }

  const isSignUp = mode === "password" && passwordSubmode === "sign_up";

  return (
    <section className="surface-panel mx-auto w-full max-w-md p-6 sm:p-7">
      <header className="space-y-2">
        <p className="type-label">{isSignUp ? "Create Account" : "Sign In"}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Welcome to Command Tower</h1>
        <p className="text-sm text-[color:var(--text-subtle)]">Your decks, library, and workspace data stay private to your account.</p>
      </header>

      {/* Top-level mode toggle */}
      <div className="mt-5 inline-flex rounded-xl border border-white/12 bg-white/[0.02] p-1">
        <button
          type="button"
          onClick={() => switchMode("magic_link")}
          className={cn("nav-link rounded-lg px-3 py-1.5", mode === "magic_link" && "nav-link-active")}
        >
          Magic Link
        </button>
        <button
          type="button"
          onClick={() => switchMode("password")}
          className={cn("nav-link rounded-lg px-3 py-1.5", mode === "password" && "nav-link-active")}
        >
          Password
        </button>
      </div>

      {/* Password sign-in / sign-up submode toggle */}
      {mode === "password" ? (
        <div className="mt-3 inline-flex rounded-lg border border-white/8 bg-white/[0.015] p-0.5">
          <button
            type="button"
            onClick={() => switchPasswordSubmode("sign_in")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition",
              passwordSubmode === "sign_in"
                ? "bg-white/10 text-zinc-100"
                : "text-[color:var(--text-subtle)] hover:text-zinc-300",
            )}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchPasswordSubmode("sign_up")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition",
              passwordSubmode === "sign_up"
                ? "bg-white/10 text-zinc-100"
                : "text-[color:var(--text-subtle)] hover:text-zinc-300",
            )}
          >
            Create Account
          </button>
        </div>
      ) : null}

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
          <>
            <label className="block space-y-2">
              <span className="type-label">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={passwordSubmode === "sign_up" ? 8 : undefined}
                className="w-full rounded-xl border border-white/14 bg-white/[0.03] px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-white/30"
                placeholder={passwordSubmode === "sign_up" ? "At least 8 characters" : "Your password"}
              />
            </label>

            {passwordSubmode === "sign_up" ? (
              <label className="block space-y-2">
                <span className="type-label">Confirm Password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  className="w-full rounded-xl border border-white/14 bg-white/[0.03] px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-white/30"
                  placeholder="Repeat your password"
                />
              </label>
            ) : null}
          </>
        ) : null}

        {message ? (
          <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-300">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">
            {error}
          </p>
        ) : callbackError ? (
          <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">
            {callbackError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="nav-link nav-link-active inline-flex w-full items-center justify-center py-2.5 disabled:opacity-60"
        >
          {isPending
            ? "Working..."
            : mode === "magic_link"
              ? "Send Magic Link"
              : passwordSubmode === "sign_up"
                ? "Create Account"
                : "Sign In"}
        </button>

        {mode === "password" && passwordSubmode === "sign_in" ? (
          <p className="text-center text-xs text-[color:var(--text-subtle)]">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => switchPasswordSubmode("sign_up")}
              className="text-zinc-300 underline-offset-2 hover:underline"
            >
              Create one
            </button>
          </p>
        ) : null}

        {mode === "password" && passwordSubmode === "sign_up" ? (
          <p className="text-center text-xs text-[color:var(--text-subtle)]">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => switchPasswordSubmode("sign_in")}
              className="text-zinc-300 underline-offset-2 hover:underline"
            >
              Sign in
            </button>
          </p>
        ) : null}
      </form>
    </section>
  );
}
