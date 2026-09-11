"use client";

import { useCallback, useState } from "react";

type CheckKey = "health" | "env" | "supabase";

type StepResult = { ok: boolean; detail: string; ms?: number };

type CheckResult = {
  ok: boolean;
  integration?: string;
  detail?: string;
  missing?: string[];
  steps?: Record<string, StepResult>;
  env?: Record<string, boolean>;
};

const CHECKS: { key: CheckKey; label: string; path: string }[] = [
  { key: "health", label: "Server liveness", path: "/api/check/health" },
  { key: "env", label: "Environment variables", path: "/api/check/env" },
  { key: "supabase", label: "Supabase (DB + Auth + Admin)", path: "/api/check/supabase" },
];

type State = Record<CheckKey, { loading: boolean; result: CheckResult | null; error: string | null }>;

const initial: State = CHECKS.reduce((acc, c) => {
  acc[c.key] = { loading: false, result: null, error: null };
  return acc;
}, {} as State);

export default function IntegrationChecker() {
  const [state, setState] = useState<State>(initial);

  const runOne = useCallback(async (key: CheckKey, path: string) => {
    setState((s) => ({ ...s, [key]: { loading: true, result: null, error: null } }));
    try {
      const res = await fetch(path);
      const data = (await res.json()) as CheckResult;
      setState((s) => ({
        ...s,
        [key]: { loading: false, result: data, error: null },
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        [key]: { loading: false, result: null, error: (e as Error).message },
      }));
    }
  }, []);

  const runAll = useCallback(() => {
    CHECKS.forEach((c) => runOne(c.key, c.path));
  }, [runOne]);

  const overallOk = CHECKS.every(
    (c) => !state[c.key].loading && state[c.key].result?.ok
  );
  const anyLoading = CHECKS.some((c) => state[c.key].loading);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={runAll}
          disabled={anyLoading}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          {anyLoading ? "Running…" : "Run all checks"}
        </button>
        {CHECKS.some((c) => state[c.key].result) && (
          <span
            className={`text-sm font-medium ${
              overallOk ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {overallOk ? "All green" : "Some checks failing"}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {CHECKS.map((c) => {
          const st = state[c.key];
          const ok = st.result?.ok;
          const status = st.loading
            ? "pending"
            : ok === true
            ? "pass"
            : ok === false
            ? "fail"
            : "idle";

          return (
            <div
              key={c.key}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Dot status={status} />
                  <span className="font-medium">{c.label}</span>
                </div>
                <button
                  onClick={() => runOne(c.key, c.path)}
                  disabled={st.loading}
                  className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {st.loading ? "…" : "Run"}
                </button>
              </div>

              <Body st={st} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Dot({ status }: { status: "idle" | "pending" | "pass" | "fail" }) {
  const color =
    status === "pass"
      ? "bg-emerald-400"
      : status === "fail"
      ? "bg-rose-400"
      : status === "pending"
      ? "bg-amber-400 animate-pulse"
      : "bg-slate-600";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}

function Body({
  st,
}: {
  st: { loading: boolean; result: CheckResult | null; error: string | null };
}) {
  if (st.loading) {
    return <p className="mt-2 text-xs text-slate-500">Checking…</p>;
  }
  if (st.error) {
    return <p className="mt-2 text-xs text-rose-400">Error: {st.error}</p>;
  }
  if (!st.result) {
    return <p className="mt-2 text-xs text-slate-500">Not run yet.</p>;
  }

  const r = st.result;
  return (
    <div className="mt-2 space-y-1 text-xs text-slate-400">
      {r.detail && <p>{r.detail}</p>}
      {r.missing && r.missing.length > 0 && (
        <p className="text-rose-400">Missing env: {r.missing.join(", ")}</p>
      )}
      {r.env && (
        <ul className="mt-1 grid grid-cols-1 gap-0.5 sm:grid-cols-2">
          {Object.entries(r.env).map(([k, v]) => (
            <li key={k} className="font-mono">
              <span className={v ? "text-emerald-400" : "text-rose-400"}>
                {v ? "✓" : "✗"}
              </span>{" "}
              {k}
            </li>
          ))}
        </ul>
      )}
      {r.steps && (
        <ul className="mt-1 space-y-0.5">
          {Object.entries(r.steps).map(([k, s]) => (
            <li key={k}>
              <span className={s.ok ? "text-emerald-400" : "text-rose-400"}>
                {s.ok ? "✓" : "✗"}
              </span>{" "}
              <span className="font-mono">{k}</span>: {s.detail}
              {s.ms != null && <span className="text-slate-600"> ({s.ms}ms)</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
