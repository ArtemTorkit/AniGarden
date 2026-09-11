"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Provider = "google";

export default function LoginPage() {
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: Provider) {
    setError(null);
    setLoadingProvider(provider);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (signInError) throw signInError;
    } catch (signInError) {
      setLoadingProvider(null);
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Unable to start sign in. Please try again."
      );
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-garden-950 px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(132,204,22,0.22),_transparent_58%)]" />

      <section className="relative w-full max-w-md rounded-3xl border border-lime-300/20 bg-garden-900/90 p-8 shadow-2xl shadow-black/30 backdrop-blur sm:p-10">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl font-black shadow-lg shadow-lime-950/50">
            ✦
          </div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-lime-300">
            AniGarden
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Build your collection
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Sign in to collect original anime characters and trade your rarest
            pulls with the community.
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => signIn("google")}
            disabled={loadingProvider !== null}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-lime-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="text-base font-bold">G</span>
            {loadingProvider === "google" ? "Connecting…" : "Continue with Google"}
          </button>
        </div>

        {error ? (
          <p className="mt-5 rounded-lg border border-red-400/20 bg-red-950/40 px-3 py-2 text-center text-xs text-red-200">
            {error}
          </p>
        ) : null}

        <p className="mt-8 text-center text-xs leading-5 text-slate-500">
          By continuing, you agree to use the platform for collecting and
          trading characters within its closed-loop economy.
        </p>
      </section>
    </main>
  );
}
