import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUser } from "@/lib/supabase/server";

const BUCKET = "avatars";
const MAX_BYTES = 3 * 1024 * 1024;

// POST /api/players/[playerId]/avatar — body is the raw (already downscaled)
// image bytes. Unlike /api/profile/avatar (keyed by the caller's own auth
// user), this sets a photo on a `players` row, which is how guest players
// (added by name, no account of their own) get an avatar — they have no
// `profiles` row to hang one off of.
export async function POST(req: Request, { params }: { params: Promise<{ playerId: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { playerId } = await params;

  const supabase = await createClient();
  const { data: player } = await supabase
    .from("players")
    .select("id, owner_user_id")
    .eq("id", playerId)
    .maybeSingle();
  if (!player || player.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Du äger inte den här spelaren." }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Endast bildfiler tillåts." }, { status: 400 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.byteLength === 0) return NextResponse.json({ error: "Tom bild." }, { status: 400 });
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Bilden är för stor." }, { status: 413 });
  }

  const admin = createAdminClient();
  const ext = contentType.includes("webp") ? "webp" : contentType.includes("png") ? "png" : "jpg";
  const path = `player-${playerId}.${ext}`;

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType, upsert: true });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${buf.byteLength}`;

  const { error: updErr } = await admin.from("players").update({ avatar_url: url }).eq("id", playerId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, avatarUrl: url });
}
