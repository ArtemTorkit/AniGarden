import { NextResponse } from "next/server";
import { normalizePromoCode, isValidPromoCodeFormat } from "@/lib/gacha/promo-codes";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getRedemptionError(error: unknown) {
  const message = typeof error === "object" && error !== null && "message" in error
    ? String(error.message)
    : "Unable to redeem promo code";
  const knownMessages = [
    "Promo code is invalid",
    "Promo code is not active yet",
    "Promo code has expired",
    "You have already redeemed this promo code",
    "This promo code has reached its redemption limit",
  ];
  return knownMessages.find((knownMessage) => message.includes(knownMessage)) ?? "Unable to redeem promo code";
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to redeem a promo code" }, { status: 401 });

    if (!(await consumeRateLimit(`promo-redeem:${user.id}`, 10, 60))) {
      return NextResponse.json({ error: "Too many redemption attempts. Please wait a minute." }, { status: 429 });
    }

    const body = await request.json().catch(() => ({})) as { code?: unknown };
    const code = normalizePromoCode(body.code);
    if (!isValidPromoCodeFormat(code)) {
      return NextResponse.json({ error: "Enter a valid promo code" }, { status: 400 });
    }

    const { data: gems, error } = await createSupabaseAdminClient().rpc("redeem_promo_code", {
      p_user_id: user.id,
      p_code: code,
    });
    if (error) {
      const message = getRedemptionError(error);
      const status = message.includes("already redeemed") || message.includes("redemption limit") ? 409 : 400;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({ gems: Number(gems) });
  } catch (error) {
    console.error("[promo-codes] redemption error", error);
    return NextResponse.json({ error: "Unable to redeem promo code" }, { status: 500 });
  }
}
