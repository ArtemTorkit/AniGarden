"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <html lang="en"><body className="bg-slate-950 text-slate-100"><main className="flex min-h-screen items-center justify-center px-6"><section className="max-w-md rounded-2xl border border-red-400/20 bg-slate-900 p-8 text-center"><h1 className="text-2xl font-bold">The garden needs a moment.</h1><p className="mt-3 text-sm text-slate-400">Something went wrong, and the error has been recorded.</p><button type="button" onClick={() => reset()} className="mt-6 rounded-xl bg-lime-300 px-5 py-3 text-sm font-bold text-slate-950">Try again</button></section></main></body></html>;
}

