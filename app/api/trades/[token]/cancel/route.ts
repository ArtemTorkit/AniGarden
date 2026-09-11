import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: { token: string } }) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
    const { data, error } = await createSupabaseAdminClient().rpc("cancel_trade_offer", { p_user_id: user.id, p_share_token: params.token });
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Trade cannot be cancelled" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) { console.error("[trades] cancel error", error); return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to cancel trade" }, { status: 400 }); }
}
