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
    if (!(await consumeRateLimit(`trade-create:${user.id}`, 10, 60))) return NextResponse.json({ error: "Too many trade attempts. Please wait a minute." }, { status: 429 });
    const body = await request.json().catch(() => ({})) as { inventoryIds?: unknown; requestedCharacterIds?: unknown };
    const inventoryIds = Array.isArray(body.inventoryIds) && body.inventoryIds.every((id) => typeof id === "string") ? body.inventoryIds as string[] : [];
    const requestedCharacterIds = Array.isArray(body.requestedCharacterIds) && body.requestedCharacterIds.every((id) => typeof id === "string") ? body.requestedCharacterIds as string[] : [];
    const admin = createSupabaseAdminClient();
    const { data: pendingOffers, error: pendingError } = await admin.from("trade_offers").select("id, share_token, creator_user_id").eq("status", "pending");
    if (pendingError) throw pendingError;
    const pendingIds = (pendingOffers ?? []).map((offer) => offer.id);
    if (inventoryIds.length && pendingIds.length) {
      const { data: reservedItems, error: reservedError } = await admin.from("trade_offer_items").select("inventory_id, offer_id").in("offer_id", pendingIds).in("inventory_id", inventoryIds).eq("side", "creator");
      if (reservedError) throw reservedError;
      const conflict = (reservedItems ?? [])[0];
      if (conflict) {
        const offer = (pendingOffers ?? []).find((item) => item.id === conflict.offer_id);
        const ownerMessage = offer?.creator_user_id === user.id ? "Cancel the existing offer from My trade offers before reusing these cards." : "These cards are reserved by another pending offer.";
        return NextResponse.json({ error: `${ownerMessage}${offer?.share_token ? ` Offer: /trades/${offer.share_token}` : ""}` }, { status: 409 });
      }
    }
    const { data, error } = await admin.rpc("create_trade_offer", { p_user_id: user.id, p_inventory_ids: inventoryIds, p_requested_character_ids: requestedCharacterIds });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ token: result?.share_token });
  } catch (error) { console.error("[trades] create error", error); const details = typeof error === "object" && error !== null ? error as { message?: unknown; details?: unknown; hint?: unknown } : {}; const message = error instanceof Error ? error.message : typeof details.message === "string" ? details.message : typeof details.details === "string" ? details.details : typeof details.hint === "string" ? details.hint : "Unable to create trade"; return NextResponse.json({ error: message }, { status: 400 }); }
}
