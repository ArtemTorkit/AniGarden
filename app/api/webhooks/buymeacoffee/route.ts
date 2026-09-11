import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type BuyMeACoffeeEvent = {
  event_id?: number | string;
  type?: string;
  live_mode?: boolean;
  data?: {
    id?: number | string;
    transaction_id?: string;
    status?: string;
    amount?: number;
    currency?: string;
    support_note?: string | null;
  };
};

function isValidSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const actualBuffer = Buffer.from(signature.trim(), "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function extractClaimCode(note: string | null | undefined) {
  return note?.match(/ANIGARDEN-[A-Z0-9]{10}/i)?.[0]?.toUpperCase() ?? null;
}

export async function POST(request: Request) {
  const secret = process.env.BUYMEACOFFEE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 500 });

  const rawBody = await request.text();
  if (!isValidSignature(rawBody, request.headers.get("x-signature-sha256"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody) as BuyMeACoffeeEvent;
    if (event.event_id === undefined || !event.type) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const data = event.data ?? {};
    const paymentId = data.transaction_id ?? (data.id === undefined ? null : String(data.id));
    const admin = createSupabaseAdminClient();
    const { data: result, error } = await admin.rpc("process_buymeacoffee_event", {
      p_event_id: String(event.event_id),
      p_event_type: event.type,
      p_live_mode: event.live_mode !== false,
      p_payment_id: paymentId,
      p_claim_code: extractClaimCode(data.support_note),
      p_amount: data.amount ?? null,
      p_currency: data.currency ?? null,
      p_payload: event,
    });
    if (error) throw error;

    return NextResponse.json({ received: true, result });
  } catch (error) {
    console.error("[buymeacoffee] webhook error", error);
    return NextResponse.json({ error: "Unable to process webhook" }, { status: 500 });
  }
}
