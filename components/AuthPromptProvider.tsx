"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthPromptContextValue = { openLoginPrompt: (message?: string) => void };
const AuthPromptContext = createContext<AuthPromptContextValue | null>(null);

export function useAuthPrompt() {
  const context = useContext(AuthPromptContext);
  if (!context) throw new Error("useAuthPrompt must be used inside AuthPromptProvider");
  return context;
}

export function LoginPromptButton({ children = "Continue with Google", className = "" }: { children?: React.ReactNode; className?: string }) {
  const { openLoginPrompt } = useAuthPrompt();
  return <button type="button" onClick={() => openLoginPrompt()} className={className}>{children}</button>;
}

export default function AuthPromptProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const value = useMemo(() => ({ openLoginPrompt: (nextMessage?: string) => { setMessage(nextMessage ?? null); setOpen(true); } }), []);

  async function continueWithGoogle() {
    const next = `${window.location.pathname}${window.location.search}`;
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
  }

  return <AuthPromptContext.Provider value={value}>{children}{open ? <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl border border-lime-300/20 bg-garden-900 p-7 text-center shadow-2xl shadow-black/50"><button type="button" onClick={() => setOpen(false)} aria-label="Close sign-in dialog" className="float-right text-xl text-slate-500 hover:text-white">×</button><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl font-black text-garden-950">✦</div><h2 className="mt-5 text-2xl font-bold text-white">Join AniGarden</h2><p className="mt-3 text-sm leading-6 text-slate-400">{message ?? "Sign in with Google to continue collecting, trading, and growing your garden."}</p><button type="button" onClick={continueWithGoogle} className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-lime-50"><span className="text-base font-bold">G</span>Continue with Google</button><button type="button" onClick={() => setOpen(false)} className="mt-3 text-sm text-slate-500 hover:text-slate-300">Maybe later</button></div></div> : null}</AuthPromptContext.Provider>;
}
