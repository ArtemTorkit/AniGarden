import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
    const { data: code, error } = await createSupabaseAdminClient().rpc("get_or_create_referral_code", { p_user_id: user.id });
    if (error) throw error;
    return NextResponse.json({ code });
  } catch (error) {
    console.error("[referrals] code error", error);
    return NextResponse.json({ error: "Unable to create invite link" }, { status: 500 });
  }
}
