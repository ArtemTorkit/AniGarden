import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function consumeRateLimit(key: string, limit: number, windowSeconds: number) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_bucket_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw error;
  return data === true;
}
