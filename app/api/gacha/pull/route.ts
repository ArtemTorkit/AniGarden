import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { isSupportedPaidPullCount } from "@/lib/gacha/pulls";

export const runtime = "nodejs";

type PoolCharacter = {
  id: string;
  name: string;
  rarity: string;
  image_url: string;
  rarity_weight: number;
};

function rollBloomingRate() {
  const roll = randomInt(100);
  if (roll < 50) return 1;
  if (roll < 75) return 2;
  if (roll < 90) return 3;
  if (roll < 97) return 4;
  return 5;
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
    if (!(await consumeRateLimit(`gacha:${user.id}`, 30, 60))) return NextResponse.json({ error: "Too many pull requests. Please wait a minute." }, { status: 429 });

    const body = (await request.json().catch(() => ({}))) as { bannerSlug?: string; count?: number };
    if (!body.bannerSlug) return NextResponse.json({ error: "Banner is required" }, { status: 400 });
    const count = body.count ?? 1;
    if (!isSupportedPaidPullCount(count)) return NextResponse.json({ error: "Pull count must be 1, 5, or 10" }, { status: 400 });

    const admin = createSupabaseAdminClient();
    const { data: banner, error: bannerError } = await admin
      .from("gacha_banners")
      .select("id, cost_gems, daily_free")
      .eq("slug", body.bannerSlug)
      .eq("is_active", true)
      .maybeSingle();
    if (bannerError) throw bannerError;
    if (!banner) return NextResponse.json({ error: "Gacha not found" }, { status: 404 });
    if (banner.daily_free && count !== 1) return NextResponse.json({ error: "The daily gacha allows one free pull" }, { status: 400 });

    const { data: poolRows, error: poolError } = await admin
      .from("gacha_banner_characters")
      .select("character_id, rarity_weight")
      .eq("banner_id", banner.id);
    if (poolError) throw poolError;
    const ids = (poolRows ?? []).map((row) => row.character_id);
    if (!ids.length) return NextResponse.json({ error: "This gacha has no characters" }, { status: 500 });

    const { data: characterRows, error: characterError } = await admin
      .from("Characters")
      .select("id, name, rarity, image_url")
      .in("id", ids);
    if (characterError) throw characterError;

    const characters = (characterRows ?? []).map((character) => ({
      ...character,
      rarity_weight: poolRows?.find((row) => row.character_id === character.id)?.rarity_weight ?? 0,
    })) as PoolCharacter[];
    const totalWeight = characters.reduce((sum, character) => sum + Math.max(0, character.rarity_weight), 0);
    if (!totalWeight) return NextResponse.json({ error: "This gacha has invalid weights" }, { status: 500 });

    if (banner.daily_free) {
      const { data: claimed, error: claimError } = await admin.rpc("claim_daily_gacha", {
        p_user_id: user.id,
        p_banner_id: banner.id,
      });
      if (claimError) throw claimError;
      if (!claimed) return NextResponse.json({ error: "Your free pull is already used today" }, { status: 429 });
    } else {
      const { data: spent, error: spendError } = await admin.rpc("spend_gems", {
        p_user_id: user.id,
        p_amount: banner.cost_gems * count,
      });
      if (spendError) throw spendError;
      if (!spent) return NextResponse.json({ error: "You need more gems" }, { status: 402 });
    }

    const selectedCharacters: PoolCharacter[] = [];
    for (let pull = 0; pull < count; pull += 1) {
      let ticket = randomInt(totalWeight);
      const selected = characters.find((character) => {
        ticket -= Math.max(0, character.rarity_weight);
        return ticket < 0;
      });
      if (!selected) throw new Error("Unable to select a character");
      selectedCharacters.push(selected);
    }

    const editionNumbers: number[] = [];
    const bloomingRates: number[] = [];
    for (const character of selectedCharacters) {
      const { data: edition, error: editionError } = await admin.rpc("next_character_edition", { p_character_id: character.id });
      if (editionError) throw editionError;
      editionNumbers.push(Number(edition));
      bloomingRates.push(rollBloomingRate());
    }

    const { data: inventory, error: inventoryError } = await admin
      .from("User_Inventory")
      .insert(selectedCharacters.map((character, index) => ({ user_id: user.id, character_id: character.id, edition_number: editionNumbers[index], blooming_rate: bloomingRates[index] })))
      .select("id");
    if (inventoryError) throw inventoryError;

    const { data: pullRows, error: pullError } = await admin.from("gacha_pulls").insert(
      selectedCharacters.map((character, index) => ({ user_id: user.id, banner_id: banner.id, character_id: character.id, edition_number: editionNumbers[index], blooming_rate: bloomingRates[index] }))
    ).select("id");
    if (pullError) throw pullError;

    return NextResponse.json({ characters: selectedCharacters.map((character, index) => ({ ...character, edition_number: editionNumbers[index], blooming_rate: bloomingRates[index], pull_id: pullRows?.[index]?.id })), inventoryIds: (inventory ?? []).map((item) => item.id) });
  } catch (error) {
    console.error("[gacha] pull error", error);
    return NextResponse.json({ error: "Unable to complete pull" }, { status: 500 });
  }
}
