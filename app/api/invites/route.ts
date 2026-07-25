import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUser } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/supabase/push-server";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { matchId, playerId, invitedUserId, invitedEmail } = body ?? {};
  if (typeof matchId !== "string" || typeof playerId !== "string") {
    return NextResponse.json({ error: "matchId och playerId krävs." }, { status: 400 });
  }
  if (typeof invitedUserId !== "string" && typeof invitedEmail !== "string") {
    return NextResponse.json(
      { error: "Ange antingen en befintlig användare eller en e-postadress." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, owner_user_id, mode")
    .eq("id", matchId)
    .maybeSingle();
  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 });
  if (!match || match.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Du äger inte den här matchen." }, { status: 403 });
  }

  // No `.select()` chained on this insert: RETURNING requires the
  // match_invites SELECT policy to pass, which (via is_match_participant)
  // queries match_invites again from within itself — the same
  // self-referential pattern that broke `matches` INSERT ... RETURNING (see
  // supabase/migrations/0001_init.sql). Plain INSERT without RETURNING
  // sidesteps it entirely.
  const { error: insertError } = await supabase.from("match_invites").insert({
    match_id: matchId,
    player_id: playerId,
    invited_user_id: invitedUserId ?? null,
    invited_email: invitedEmail ?? null,
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  if (typeof invitedUserId === "string") {
    const admin = createAdminClient();
    const { data: inviterProfile } = await admin
      .from("profiles")
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle();
    const inviterName = inviterProfile?.username || user.email?.split("@")[0] || "Någon";
    const modeText = match.mode === "shared-device" ? "på din enhet" : "på egna enheter";
    await sendPushToUser(admin, invitedUserId, {
      title: "Du är inbjuden att spela Maxi Yatzy",
      body: `${inviterName} bjöd in dig — ${modeText}.`,
      url: "/",
      tag: `invite-${matchId}-${playerId}`,
    });
  }

  return NextResponse.json({ ok: true });
}
