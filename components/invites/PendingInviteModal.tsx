"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { createAuthedChannel } from "@/lib/supabase/authedChannel";
import { getProfiles } from "@/lib/supabase/profiles";
import { useAuthStore } from "@/lib/store/useAuthStore";

interface InviteRow {
  id: string;
  match_id: string;
  mode: string;
  owner_user_id: string;
  player_name: string;
}

interface PendingInvite {
  id: string;
  matchId: string;
  mode: string;
  playerName: string;
  ownerName: string;
}

async function loadPendingInvites(): Promise<PendingInvite[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("list_pending_invites");
  if (error) throw error;
  const rows = (data ?? []) as InviteRow[];

  const ownerIds = [...new Set(rows.map((row) => row.owner_user_id))];
  const profiles = await getProfiles(ownerIds);

  return rows.map((row) => ({
    id: row.id,
    matchId: row.match_id,
    mode: row.mode,
    playerName: row.player_name,
    ownerName: profiles[row.owner_user_id]?.username || "Någon",
  }));
}

export function PendingInviteModal() {
  const { user } = useAuthStore();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    function refresh() {
      loadPendingInvites().then((list) => {
        if (!cancelled) setInvites(list);
      });
    }
    refresh();

    const unsubscribe = createAuthedChannel(`pending-invites:${user.id}`, (channel) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_invites" },
        () => refresh(),
      );
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);

  const invite = invites[0];

  async function respond(accept: boolean) {
    if (!invite || busy) return;
    setBusy(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc(accept ? "accept_invite" : "decline_invite", {
        p_invite_id: invite.id,
      });
      if (error) throw error;
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } finally {
      setBusy(false);
    }
  }

  if (!invite) return null;

  const deviceText =
    invite.mode === "shared-device"
      ? `Spelas på ${invite.ownerName}s enhet.`
      : "Spelas på din egen enhet.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-gold/25 bg-[#1a1410] p-6 shadow-[0_20px_50px_rgba(0,0,0,.5)]">
        <div className="mb-1 text-[10px] font-extrabold tracking-[.28em] text-gold">
          MAXI YATZY
        </div>
        <h2 className="font-serif text-2xl font-semibold text-paper">Du är inbjuden!</h2>
        <p className="mt-3 text-sm text-paper-dim">
          <span className="font-semibold text-paper">{invite.ownerName}</span> har bjudit in
          dig att spela som <span className="font-semibold text-paper">{invite.playerName}</span>.
        </p>
        <p className="mt-1 text-sm text-paper-dim">{deviceText}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => respond(false)}
            disabled={busy}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-semibold text-paper-dim disabled:opacity-60"
          >
            Avslå
          </button>
          <button
            type="button"
            onClick={() => respond(true)}
            disabled={busy}
            className="flex-1 rounded-xl px-4 py-2.5 font-extrabold text-[#241708] disabled:opacity-60"
            style={{ background: "linear-gradient(150deg,#eecb7c,#b98d38)" }}
          >
            Godkänn
          </button>
        </div>
      </div>
    </div>
  );
}
