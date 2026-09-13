import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  calculateGemsFromUsdCents,
  MAX_BUY_ME_A_COFFEE_AMOUNT_CENTS,
  MIN_BUY_ME_A_COFFEE_AMOUNT_CENTS,
} from "@/lib/billing/buymeacoffee";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
    if (!(await consumeRateLimit(`bmc-intent:${user.id}`, 5, 3600))) return NextResponse.json({ error: "Too many purchase attempts. Please try again later." }, { status: 429 });

    const body = (await request.json().catch(() => ({}))) as { amountUsd?: number };
    const amountUsd = Number(body.amountUsd);
    const amountCents = Math.round(amountUsd * 100);
    if (!Number.isFinite(amountUsd) || !Number.isFinite(amountCents) || amountCents < MIN_BUY_ME_A_COFFEE_AMOUNT_CENTS || amountCents > MAX_BUY_ME_A_COFFEE_AMOUNT_CENTS) {
      return NextResponse.json({ error: "Choose an amount between $4.00 and $500.00" }, { status: 400 });
    }
    const gems = calculateGemsFromUsdCents(amountCents);

    const claimCode = `ANIGARDEN-${randomBytes(5).toString("hex").toUpperCase()}`;
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("gem_purchase_intents").insert({
      user_id: user.id,
      claim_code: claimCode,
      package_id: "variable",
      expected_amount: amountCents / 100,
      gem_amount: gems,
    });
    if (error) throw error;

    return NextResponse.json({
      claimCode,
      amountUsd: amountCents / 100,
      gems,
      paymentUrl: process.env.BUYMEACOFFEE_PAGE_URL ?? null,
    });
  } catch (error) {
    console.error("[buymeacoffee] intent error", error);
    return NextResponse.json({ error: "Unable to start gem purchase" }, { status: 500 });
  }
}
