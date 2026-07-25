"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MatchCard } from "@/components/dashboard/MatchCard";
import type { Match, MatchPlayer, Player } from "@/lib/domain/types";
import { getRepositories } from "@/lib/repositories";
import { getProfiles, type Profile } from "@/lib/supabase/profiles";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { usePlayersStore } from "@/lib/store/usePlayersStore";

export default function DashboardPage() {
  const authLoading = useAuthStore((s) => s.loading);
  const { players, localPlayerId, load, loaded } = usePlayersStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchPlayersByMatch, setMatchPlayersByMatch] = useState<
    Record<string, MatchPlayer[]>
  >({});
  const [profilesByUserId, setProfilesByUserId] = useState<Record<string, Profile>>({});
  // usePlayersStore only holds players *owned* by this account. A match
  // participant invited by another owner (their player row belongs to that
  // owner, only linked_user_id points at us) wouldn't resolve a name from
  // that store alone, showing "?" in MatchCard even though RLS now permits
  // fetching that specific player row (accepted invite => is_match_participant).
  const [extraPlayersById, setExtraPlayersById] = useState<Record<string, Player>>({});
  const attemptedExtraPlayerIds = useRef(new Set<string>());

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  useEffect(() => {
    if (!loaded) return;
    async function loadMatches() {
      const repos = getRepositories();
      const list = await repos.matches.listMatches();
      list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setMatches(list);
      const entries = await Promise.all(
        list.map(
          async (m) => [m.id, await repos.matches.listMatchPlayers(m.id)] as const,
        ),
      );
      setMatchPlayersByMatch(Object.fromEntries(entries));
    }
    loadMatches();
  }, [loaded]);

  useEffect(() => {
    const allPlayers = [...players, ...Object.values(extraPlayersById)];
    const userIds = [...new Set(allPlayers.map((p) => p.linkedUserId).filter((id): id is string => !!id))];
    if (userIds.length === 0) return;
    getProfiles(userIds).then(setProfilesByUserId);
  }, [players, extraPlayersById]);

  useEffect(() => {
    const ownedIds = new Set(players.map((p) => p.id));
    const missingIds = [...new Set(matches.flatMap((m) => m.playerIds))].filter(
      (id) => !ownedIds.has(id) && !attemptedExtraPlayerIds.current.has(id),
    );
    if (missingIds.length === 0) return;
    for (const id of missingIds) attemptedExtraPlayerIds.current.add(id);
    const repos = getRepositories();
    Promise.all(missingIds.map((id) => repos.players.getPlayer(id))).then((results) => {
      const found: Record<string, Player> = {};
      for (const p of results) if (p) found[p.id] = p;
      setExtraPlayersById((prev) => ({ ...prev, ...found }));
    });
  }, [matches, players]);

  const playersById: Record<string, Player> = {
    ...extraPlayersById,
    ...Object.fromEntries(players.map((p) => [p.id, p])),
  };

  if (authLoading || !loaded) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-[10px] font-extrabold tracking-[.32em] text-gold">
          MAXI YATZY
        </div>
        <p className="text-sm text-paper-dim">Förbereder ditt konto…</p>
      </div>
    );
  }

  const inProgress = matches.filter((m) => m.status === "in_progress");
  const completed = matches.filter((m) => m.status === "completed");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 pt-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] font-extrabold tracking-[.28em] text-gold">
            MAXI YATZY
          </div>
          <h1 className="font-serif text-3xl font-semibold text-paper">Mina matcher</h1>
        </div>
        <nav className="flex gap-2 text-xs font-semibold">
          <Link
            href="/ranking"
            className="rounded-full border border-gold/20 bg-white/5 px-3 py-1.5 text-paper-dim hover:border-gold/40"
          >
            Ranking
          </Link>
          <Link
            href="/players"
            className="rounded-full border border-gold/20 bg-white/5 px-3 py-1.5 text-paper-dim hover:border-gold/40"
          >
            Spelare
          </Link>
        </nav>
      </div>

      <Link
        href="/match/new"
        className="rounded-2xl px-6 py-3.5 text-center font-extrabold tracking-[.06em] text-[#241708] shadow-[0_12px_26px_rgba(0,0,0,.4)]"
        style={{ background: "linear-gradient(150deg,#eecb7c,#b98d38)" }}
      >
        + NY MATCH
      </Link>

      <section>
        <h2 className="mb-2 text-[10px] font-extrabold tracking-[.24em] text-sage">
          PÅGÅENDE
        </h2>
        <div className="flex flex-col gap-2.5">
          {inProgress.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              matchPlayers={matchPlayersByMatch[m.id] ?? []}
              players={playersById}
              profiles={profilesByUserId}
              localPlayerId={localPlayerId}
            />
          ))}
          {inProgress.length === 0 && (
            <p className="text-sm text-muted-dim">Inga pågående matcher.</p>
          )}
        </div>
      </section>

      {completed.length > 0 && (
        <section>
          <h2 className="mb-2 text-[10px] font-extrabold tracking-[.24em] text-sage">
            AVSLUTADE
          </h2>
          <div className="flex flex-col gap-2.5">
            {completed.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                matchPlayers={matchPlayersByMatch[m.id] ?? []}
                players={playersById}
                profiles={profilesByUserId}
                localPlayerId={localPlayerId}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
