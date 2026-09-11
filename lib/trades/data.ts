import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCardValue, getInventoryValue } from "@/lib/gacha/value";

export type TradeCard = {
  id: string;
  character_id: string;
  name: string;
  rarity: string;
  image_url: string;
  acquired_at: string;
  edition_number: number | null;
  blooming_rate: number;
};

export type TradeCharacter = { id: string; name: string; rarity: string; image_url: string };

export async function getTradeCharacterCatalog(): Promise<TradeCharacter[]> {
  const { data, error } = await createSupabaseAdminClient().from("Characters").select("id, name, rarity, image_url").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getTradeCards(userId: string): Promise<TradeCard[]> {
  const admin = createSupabaseAdminClient();
  const { data: inventory, error } = await admin.from("User_Inventory").select("id, character_id, acquired_at, edition_number, blooming_rate").eq("user_id", userId).order("acquired_at", { ascending: false });
  if (error) throw error;
  const ids = [...new Set((inventory ?? []).map((item) => item.character_id))];
  const { data: characters, error: characterError } = ids.length ? await admin.from("Characters").select("id, name, rarity, image_url").in("id", ids) : { data: [], error: null };
  if (characterError) throw characterError;
  const map = new Map((characters ?? []).map((character) => [character.id, character]));
  return (inventory ?? []).flatMap((item) => {
    const character = map.get(item.character_id);
    return character ? [{ ...character, id: item.id, character_id: item.character_id, acquired_at: item.acquired_at, edition_number: item.edition_number, blooming_rate: item.blooming_rate ?? 1 }] : [];
  });
}

export async function getTradeOffer(shareToken: string) {
  const admin = createSupabaseAdminClient();
  const { data: offer, error } = await admin.from("trade_offers").select("id, share_token, creator_user_id, accepter_user_id, status, created_at, completed_at").eq("share_token", shareToken).maybeSingle();
  if (error) throw error;
  if (!offer) return null;
  const { data: rows, error: itemError } = await admin.from("trade_offer_items").select("inventory_id, side").eq("offer_id", offer.id);
  if (itemError) throw itemError;
  const cards = await getCardsByIds((rows ?? []).map((row) => row.inventory_id));
  const cardMap = new Map(cards.map((card) => [card.id, card]));
  const creatorItems = (rows ?? []).filter((row) => row.side === "creator").flatMap((row) => { const card = cardMap.get(row.inventory_id); return card ? [card] : []; });
  const { data: requestedRows, error: requestedError } = await admin.from("trade_offer_requested_characters").select("character_id, quantity").eq("offer_id", offer.id);
  if (requestedError) throw requestedError;
  const requestedCharacters = await getCharactersByIds((requestedRows ?? []).map((row) => row.character_id));
  const requestedValue = (requestedRows ?? []).reduce((sum, row) => { const character = requestedCharacters.find((item) => item.id === row.character_id); return sum + (character ? getCardValue(character.rarity) * row.quantity : 0); }, 0);
  return { ...offer, creatorItems, creatorValue: getInventoryValue(creatorItems), requestedCharacters, requestedValue };
}

async function getCardsByIds(ids: string[]) {
  if (!ids.length) return [];
  const admin = createSupabaseAdminClient();
  const { data: inventory, error } = await admin.from("User_Inventory").select("id, character_id, acquired_at, edition_number, blooming_rate").in("id", ids);
  if (error) throw error;
  const characterIds = [...new Set((inventory ?? []).map((item) => item.character_id))];
  const { data: characters, error: characterError } = await admin.from("Characters").select("id, name, rarity, image_url").in("id", characterIds);
  if (characterError) throw characterError;
  const map = new Map((characters ?? []).map((character) => [character.id, character]));
  return (inventory ?? []).flatMap((item) => { const character = map.get(item.character_id); return character ? [{ ...character, id: item.id, character_id: item.character_id, acquired_at: item.acquired_at, edition_number: item.edition_number, blooming_rate: item.blooming_rate ?? 1 }] : []; });
}

async function getCharactersByIds(ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await createSupabaseAdminClient().from("Characters").select("id, name, rarity, image_url").in("id", ids);
  if (error) throw error;
  const map = new Map((data ?? []).map((character) => [character.id, character]));
  return ids.flatMap((id) => { const character = map.get(id); return character ? [character] : []; });
}

export async function getPendingTradeOffers() {
  const admin = createSupabaseAdminClient();
  const { data: offers, error } = await admin.from("trade_offers").select("id, share_token, creator_user_id, status, created_at").eq("status", "pending").order("created_at", { ascending: false });
  if (error) throw error;
  const results = [];
  for (const offer of offers ?? []) {
    const { data: rows, error: itemError } = await admin.from("trade_offer_items").select("inventory_id").eq("offer_id", offer.id).eq("side", "creator");
    if (itemError) throw itemError;
    const creatorItems = await getCardsByIds((rows ?? []).map((row) => row.inventory_id));
    const { data: requestedRows, error: requestedError } = await admin.from("trade_offer_requested_characters").select("character_id, quantity").eq("offer_id", offer.id);
    if (requestedError) throw requestedError;
    const requestedCharacters = await getCharactersByIds((requestedRows ?? []).map((row) => row.character_id));
    const requestedValue = (requestedRows ?? []).reduce((sum, row) => { const character = requestedCharacters.find((item) => item.id === row.character_id); return sum + (character ? getCardValue(character.rarity) * row.quantity : 0); }, 0);
    results.push({ ...offer, creatorItems, creatorValue: getInventoryValue(creatorItems), requestedCharacters, requestedValue });
  }
  return results;
}

export async function getUserTradeOffers(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data: offers, error } = await admin.from("trade_offers").select("id, share_token, creator_user_id, status, created_at, completed_at").eq("creator_user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  const results = [];
  for (const offer of offers ?? []) {
    const { data: rows, error: itemError } = await admin.from("trade_offer_items").select("inventory_id").eq("offer_id", offer.id).eq("side", "creator");
    if (itemError) throw itemError;
    const creatorItems = await getCardsByIds((rows ?? []).map((row) => row.inventory_id));
    const { data: requestedRows, error: requestedError } = await admin.from("trade_offer_requested_characters").select("character_id, quantity").eq("offer_id", offer.id);
    if (requestedError) throw requestedError;
    const requestedCharacters = await getCharactersByIds((requestedRows ?? []).map((row) => row.character_id));
    const requestedValue = (requestedRows ?? []).reduce((sum, row) => { const character = requestedCharacters.find((item) => item.id === row.character_id); return sum + (character ? getCardValue(character.rarity) * row.quantity : 0); }, 0);
    results.push({ ...offer, creatorItems, creatorValue: getInventoryValue(creatorItems), requestedCharacters, requestedValue });
  }
  return results;
}
