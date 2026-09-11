import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function getCharacterOwnerCounts(characterIds: string[]) {
  if (!characterIds.length) return {};
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("User_Inventory").select("character_id, user_id").in("character_id", characterIds);
  if (error) throw error;
  const owners = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    if (!owners.has(row.character_id)) owners.set(row.character_id, new Set());
    owners.get(row.character_id)?.add(row.user_id);
  }
  return Object.fromEntries(characterIds.map((id) => [id, owners.get(id)?.size ?? 0]));
}
