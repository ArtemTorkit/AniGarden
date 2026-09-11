"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TradeCancelButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function cancel() { setBusy(true); await fetch(`/api/trades/${token}/cancel`, { method: "POST" }); router.refresh(); }
  return <button type="button" disabled={busy} onClick={cancel} className="rounded-xl border border-red-300/30 px-4 py-2 text-sm font-semibold text-red-200 hover:border-red-300 disabled:opacity-50">{busy ? "Cancelling…" : "Cancel offer"}</button>;
}
