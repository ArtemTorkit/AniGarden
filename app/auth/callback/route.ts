import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const referralCode = requestUrl.searchParams.get("ref");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    if (data.user && referralCode) {
      const { error } = await createSupabaseAdminClient().rpc("complete_referral", { p_referred_user_id: data.user.id, p_referral_code: referralCode });
      if (error) console.error("[referrals] completion error", error);
    }
  }

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
