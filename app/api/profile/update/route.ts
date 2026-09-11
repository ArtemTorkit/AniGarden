import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "You must be signed in" }, { status: 401 });

    const formData = await request.formData();
    const nicknameValue = formData.get("nickname");
    const nickname = typeof nicknameValue === "string" ? nicknameValue.trim() : "";
    if (nickname.length < 3 || nickname.length > 24) {
      return NextResponse.json({ error: "Nickname must be 3–24 characters" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const metadata: { [key: string]: any } = { ...user.user_metadata, nickname };
    const hideInventoryValue = formData.get("hide_inventory");
    if (hideInventoryValue !== null) metadata.hide_inventory = hideInventoryValue === "true";
    const avatar = formData.get("avatar");

    if (avatar instanceof File && avatar.size > 0) {
      if (!allowedTypes.has(avatar.type) || avatar.size > MAX_AVATAR_BYTES) {
        return NextResponse.json({ error: "Use a JPG, PNG, or WebP image up to 5 MB" }, { status: 400 });
      }
      const extension = avatar.type.split("/")[1].replace("jpeg", "jpg");
      const path = `profiles/${user.id}/avatar.${extension}`;
      const { error: uploadError } = await admin.storage
        .from("photos")
        .upload(path, Buffer.from(await avatar.arrayBuffer()), { contentType: avatar.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = admin.storage.from("photos").getPublicUrl(path);
      metadata.avatar_url = publicUrl.publicUrl;
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: metadata,
    });
    if (updateError) throw updateError;

    return NextResponse.json({ nickname, avatarUrl: metadata.avatar_url ?? null });
  } catch (error) {
    console.error("[profile] update error", error);
    return NextResponse.json({ error: "Unable to update profile" }, { status: 500 });
  }
}
