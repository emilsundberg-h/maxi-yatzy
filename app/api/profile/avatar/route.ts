import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";

const BUCKET = "avatars";
const MAX_BYTES = 3 * 1024 * 1024;

// POST /api/profile/avatar — body is the raw (already downscaled) image bytes.
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Endast bildfiler tillåts." }, { status: 400 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.byteLength === 0) return NextResponse.json({ error: "Tom bild." }, { status: 400 });
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Bilden är för stor." }, { status: 413 });
  }

  const supabase = createAdminClient();
  const ext = contentType.includes("webp") ? "webp" : contentType.includes("png") ? "png" : "jpg";
  const path = `${user.id}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, { contentType, upsert: true });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${buf.byteLength}`;

  const { error: updErr } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, avatar_url: url }, { onConflict: "user_id" });
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, avatarUrl: url });
}
