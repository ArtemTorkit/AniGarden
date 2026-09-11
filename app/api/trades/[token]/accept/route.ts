import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { token: string } }) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
    const body = await request.json().catch(() => ({})) as { inventoryIds?: unknown };
    const inventoryIds = Array.isArray(body.inventoryIds) && body.inventoryIds.every((id) => typeof id === "string") ? body.inventoryIds as string[] : [];
    const { error } = await createSupabaseAdminClient().rpc("accept_trade_offer", { p_user_id: user.id, p_share_token: params.token, p_inventory_ids: inventoryIds });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { console.error("[trades] accept error", error); return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to accept trade" }, { status: 400 }); }
}
