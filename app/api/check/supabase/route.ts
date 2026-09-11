import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type StepResult = { ok: boolean; detail: string; ms?: number };

async function timed<T>(
  fn: () => Promise<T>
): Promise<{ value: T | null; error: string | null; ms: number }> {
  const start = Date.now();
  try {
    const value = await fn();
    return { value, error: null, ms: Date.now() - start };
  } catch (e) {
    return { value: null, error: (e as Error).message, ms: Date.now() - start };
  }
}

// Verifies Supabase connectivity across three surfaces:
//  1. server (anon, RLS-scoped) — can reach the DB and read the Characters table
//  2. session  — auth service is reachable and getUser() resolves
//  3. admin (service role) — bypasses RLS, can query auth.users
export async function GET() {
  const steps: Record<string, StepResult> = {};

  // 1. Server client (anon key, RLS) — read Characters. Use a real select
  // (not head:true) so a missing table surfaces as an error instead of a
  // silent null count.
  const serverRes = await timed(async () => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("Characters")
      .select("*")
      .limit(1);
    if (error) throw error;
    return Array.isArray(data) ? data.length : 0;
  });
  steps.server = serverRes.error
    ? { ok: false, detail: serverRes.error, ms: serverRes.ms }
    : { ok: true, detail: "Characters table readable", ms: serverRes.ms };

  // 2. Auth session service. "Auth session missing!" is the expected response
  // when nobody is logged in — it proves the Auth service is reachable, so we
  // treat it as ok. Any other error is a real failure.
  const sessionRes = await timed(async () => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("session") || msg.includes("missing")) {
        return { reachable: true, loggedIn: false };
      }
      throw new Error(error.message);
    }
    return { reachable: true, loggedIn: Boolean(data.user) };
  });
  steps.session = sessionRes.error
    ? { ok: false, detail: sessionRes.error, ms: sessionRes.ms }
    : {
        ok: true,
        detail: sessionRes.value?.loggedIn
          ? "auth.getUser() OK (user signed in)"
          : "auth service reachable (no user signed in)",
        ms: sessionRes.ms,
      };

  // 3. Admin client (service role) — list a single auth user page
  const adminRes = await timed(async () => {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    if (error) throw error;
    return data.users.length;
  });
  steps.admin = adminRes.error
    ? { ok: false, detail: adminRes.error, ms: adminRes.ms }
    : { ok: true, detail: "service-role admin reachable", ms: adminRes.ms };

  const ok = Object.values(steps).every((s) => s.ok);
  return NextResponse.json(
    { ok, integration: "supabase", steps },
    { status: ok ? 200 : 500 }
  );
}
