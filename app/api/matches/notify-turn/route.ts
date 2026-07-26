import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUser } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/supabase/push-server";

// POST /api/matches/notify-turn — best-effort "it's your turn" push, called
// by the client right after a score() advances the turn to another player.
// Only meaningful for separate-devices matches; shared-device play is
// pass-and-play on one phone, so there's no one else to notify.
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { matchId, playerId, turnNumber } = body ?? {};
  if (typeof matchId !== "string" || typeof playerId !== "string") {
    return NextResponse.json({ error: "matchId och playerId krävs." }, { status: 400 });
  }

  const supabase = await createClient();

  // RLS already scopes this to matches the caller can see (owner or
  // accepted participant) — a non-participant gets no row back, which is
  // exactly the authorization check we want here.
  const { data: match } = await supabase
    .from("matches")
    .select("id, mode")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.mode !== "separate-devices") return NextResponse.json({ ok: true });

  const { data: player } = await supabase
    .from("players")
    .select("linked_user_id, name")
    .eq("id", playerId)
    .maybeSingle();
  const targetUserId = player?.linked_user_id;
  if (!targetUserId || targetUserId === user.id) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  await sendPushToUser(admin, targetUserId, {
    title: "Din tur i Maxi Yatzy!",
    body: typeof turnNumber === "number" ? `Runda ${turnNumber}/20` : "Dags att kasta tärningarna.",
    url: `/match/${matchId}`,
    tag: `turn-${matchId}-${turnNumber ?? ""}`,
  });

  return NextResponse.json({ ok: true });
}
