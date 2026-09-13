import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
    if (!(await consumeRateLimit(`inventory-sell:${user.id}`, 30, 60))) {
      return NextResponse.json({ error: "Too many sell attempts. Please wait a minute." }, { status: 429 });
    }

    const body = await request.json().catch(() => ({})) as { inventoryId?: unknown };
    if (typeof body.inventoryId !== "string" || !body.inventoryId) {
      return NextResponse.json({ error: "Inventory item is required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: sellAmount, error } = await admin.rpc("sell_inventory_character", {
      p_user_id: user.id,
      p_inventory_id: body.inventoryId,
    });
    if (error) throw error;

    return NextResponse.json({ gems: Number(sellAmount) });
  } catch (error) {
    console.error("[inventory] sell error", error);
    const details = typeof error === "object" && error !== null ? error as { message?: unknown } : {};
    return NextResponse.json({ error: typeof details.message === "string" ? details.message : "Unable to sell character" }, { status: 400 });
  }
}
