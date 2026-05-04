"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { AuthError } from "firebase/auth";
import { useAuth } from "@/contexts/auth-context";

function mapAuthError(err: AuthError): string {
  const code = err.code;
  const map: Record<string, string> = {
    "auth/email-already-in-use": "That email is already registered.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Use at least 6 characters for the password.",
    "auth/user-not-found": "No account for this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/popup-closed-by-user": "Sign-in popup was closed.",
    "auth/account-exists-with-different-credential":
      "This email is linked to another sign-in method.",
  };
  return map[code] ?? err.message ?? "Something went wrong.";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  const {
    user,
    loading: authLoading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
  } = useAuth();

  const [mode, setMode] = useState<"sign-in" | "register">(() =>
    searchParams.get("mode") === "register" ? "register" : "sign-in",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firebaseReady = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(nextPath);
    }
  }, [authLoading, user, router, nextPath]);

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      router.replace(nextPath);
    } catch (err) {
      setError(mapAuthError(err as AuthError));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      router.replace(nextPath);
    } catch (err) {
      setError(mapAuthError(err as AuthError));
    } finally {
      setBusy(false);
    }
  }

  if (!firebaseReady) {
    return (
      <div className="mx-auto max-w-md rounded-m-hero border border-surface-300 bg-surface-100 p-m-8 text-center text-[13px] text-ink-3">
        Add{" "}
        <code className="text-gold-light">NEXT_PUBLIC_FIREBASE_*</code> to{" "}
        <code className="text-gold-light">.env.local</code>.
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-m-hero border border-surface-300 bg-surface-100 shadow-[0_0_0_1px_rgba(201,168,76,0.06)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, var(--gold), transparent)",
          opacity: 0.65,
        }}
      />
      <div className="p-m-8 pt-m-6">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-gold">
          Welcome
        </p>
        <h1 className="font-serif text-2xl font-semibold text-ink">
          {mode === "sign-in" ? (
            <>Sign in to <em className="text-gold not-italic">Momentra</em></>
          ) : (
            <>Create your <em className="text-gold not-italic">account</em></>
          )}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
          Email, password, or Google. Your profile syncs to our API and Supabase.
        </p>

        <div className="mt-m-6 flex rounded-m-chip border border-surface-300 p-0.5">
          <button
            type="button"
            onClick={() => {
              setMode("sign-in");
              setError(null);
            }}
            className={`flex-1 rounded-m-chip py-2.5 text-[11px] font-medium tracking-wide transition-colors ${
              mode === "sign-in"
                ? "bg-surface-200 text-ink"
                : "text-ink-4 hover:text-ink-3"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`flex-1 rounded-m-chip py-2.5 text-[11px] font-medium tracking-wide transition-colors ${
              mode === "register"
                ? "bg-surface-200 text-ink"
                : "text-ink-4 hover:text-ink-3"
            }`}
          >
            Register
          </button>
        </div>

        {error ? (
          <p
            className="mt-m-4 rounded-m-chip border border-urgency-high/40 bg-[#1C0808]/80 px-m-3 py-2 text-[12px] text-urgency-high"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <form onSubmit={(e) => void onEmailSubmit(e)} className="mt-m-6 space-y-m-4">
          {mode === "register" ? (
            <div>
              <label htmlFor="displayName" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-4">
                Display name
              </label>
              <input
                id="displayName"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2.5 text-[13px] text-ink placeholder:text-ink-4 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/25"
                placeholder="e.g. Rahul"
              />
            </div>
          ) : null}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-4">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2.5 text-[13px] text-ink placeholder:text-ink-4 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/25"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-4">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2.5 text-[13px] text-ink placeholder:text-ink-4 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/25"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={busy || authLoading}
            className="w-full rounded-m-cta bg-gradient-to-br from-gold to-gold-light py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-95 disabled:opacity-40"
          >
            {busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="relative my-m-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-rule" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-surface-100 px-m-3 text-[10px] font-medium uppercase tracking-wider text-ink-4">
              or
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={busy || authLoading}
          onClick={() => void onGoogle()}
          className="flex w-full items-center justify-center gap-m-3 rounded-m-chip border border-surface-300 bg-bg2 py-3 text-[13px] font-medium text-ink transition-colors hover:border-gold-dark hover:bg-surface-200 disabled:opacity-40"
        >
          <GoogleMark />
          Continue with Google
        </button>

        <p className="mt-m-8 text-center text-[11px] text-ink-4">
          <Link href="/" className="text-gold hover:text-gold-light">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
