"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { canonicalPlayerId } from "@/lib/domain/players";
import { totalScore } from "@/lib/domain/scoring";
import type { Player } from "@/lib/domain/types";
import { getRepositories } from "@/lib/repositories";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { usePlayersStore } from "@/lib/store/usePlayersStore";

interface RankingRow {
  id: string;
  name: string;
  wins: number;
  bestScore: number;
}

export default function RankingPage() {
  const authUserId = useAuthStore((s) => s.user?.id);
  const { players, load, loaded } = usePlayersStore();
  const [extraPlayersById, setExtraPlayersById] = useState<Record<string, Player>>({});
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [globalHigh, setGlobalHigh] = useState<
    { name: string; score: number } | undefined
  >();
  const [personalHigh, setPersonalHigh] = useState<number | undefined>();
  const [personalWins, setPersonalWins] = useState(0);
  const attemptedExtraPlayerIds = useRef(new Set<string>());

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!loaded) return;
    async function compute() {
      const repos = getRepositories();
      const matches = await repos.matches.listMatches({ status: "completed" });
      const matchPlayersByMatch = await Promise.all(
        matches.map((m) => repos.matches.listMatchPlayers(m.id)),
      );

      const knownPlayersById: Record<string, Player> = {
        ...extraPlayersById,
        ...Object.fromEntries(players.map((p) => [p.id, p])),
      };
      const missingIds = [
        ...new Set(matchPlayersByMatch.flat().map((mp) => mp.playerId)),
      ].filter((id) => !knownPlayersById[id] && !attemptedExtraPlayerIds.current.has(id));
      let resolvedPlayersById = knownPlayersById;
      if (missingIds.length > 0) {
        for (const id of missingIds) attemptedExtraPlayerIds.current.add(id);
        const fetched = await Promise.all(missingIds.map((id) => repos.players.getPlayer(id)));
        const found: Record<string, Player> = {};
        for (const p of fetched) if (p) found[p.id] = p;
        setExtraPlayersById((prev) => ({ ...prev, ...found }));
        resolvedPlayersById = { ...found, ...knownPlayersById };
      }

      const winsById: Record<string, number> = {};
      const bestById: Record<string, number> = {};
      const nameById: Record<string, string> = {};
      let best: { name: string; score: number } | undefined;

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const mps = matchPlayersByMatch[i];
        // Whoever forfeited is excluded from winning this match (even on a
        // tied or highest score) but their actual score still counts
        // toward personal-best / all-time-high stats below.
        const eligible = match.forfeitedByPlayerId
          ? mps.filter((mp) => mp.playerId !== match.forfeitedByPlayerId)
          : mps;
        const contenders = eligible.length > 0 ? eligible : mps;
        const topScore = Math.max(...contenders.map((mp) => totalScore(mp.scores)));
        for (const mp of mps) {
          const id = canonicalPlayerId(mp.playerId, resolvedPlayersById);
          const name = resolvedPlayersById[mp.playerId]?.name ?? "?";
          nameById[id] = name;
          const s = totalScore(mp.scores);
          bestById[id] = Math.max(bestById[id] ?? 0, s);
          if (!best || s > best.score) best = { name, score: s };
        }
        for (const mp of contenders) {
          if (totalScore(mp.scores) === topScore) {
            const id = canonicalPlayerId(mp.playerId, resolvedPlayersById);
            winsById[id] = (winsById[id] ?? 0) + 1;
          }
        }
      }

      const ids = new Set([...Object.keys(winsById), ...Object.keys(bestById)]);
      const nextRows = [...ids].map((id) => ({
        id,
        name: nameById[id] ?? "?",
        wins: winsById[id] ?? 0,
        bestScore: bestById[id] ?? 0,
      }));
      nextRows.sort((a, b) => b.wins - a.wins || b.bestScore - a.bestScore);
      setRows(nextRows);
      setGlobalHigh(best);
      // Own participation always canonicalizes to the signed-in account's
      // own id — whether the row it's held in was created by us or by
      // whoever invited us, its linkedUserId is our own id either way.
      setPersonalHigh(authUserId ? bestById[authUserId] : undefined);
      setPersonalWins(authUserId ? (winsById[authUserId] ?? 0) : 0);
    }
    compute();
  }, [loaded, authUserId, players, extraPlayersById]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-extrabold tracking-[.28em] text-gold">
            MAXI YATZY
          </div>
          <h1 className="font-serif text-3xl font-semibold text-paper">Ranking</h1>
        </div>
        <Link href="/" className="text-sm text-paper-dim hover:text-gold-bright">
          Till matcher
        </Link>
      </div>

      <div
        className="relative overflow-hidden rounded-[20px] border p-5"
        style={{
          borderColor: "rgba(233,200,119,.3)",
          background:
            "linear-gradient(150deg,rgba(233,200,119,.16),rgba(233,200,119,.03))",
        }}
      >
        <div className="flex items-center gap-2 text-[10px] font-extrabold tracking-[.2em] text-gold-bright">
          <span className="text-sm">♛</span>TOTALT HÖGSTA POÄNG
        </div>
        <div className="mt-1.5 flex items-end gap-3">
          <div className="font-serif text-5xl font-bold leading-none text-[#f6e6b8] tabular-nums">
            {globalHigh?.score ?? "–"}
          </div>
          {globalHigh && (
            <div className="pb-1">
              <div className="text-sm font-bold text-paper">{globalHigh.name}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-center">
          <div className="font-serif text-2xl font-semibold text-paper tabular-nums">
            {personalHigh ?? "–"}
          </div>
          <div className="mt-0.5 text-[10px] font-semibold tracking-[.1em] text-muted">
            DIN BÄSTA
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-center">
          <div className="font-serif text-2xl font-semibold text-paper tabular-nums">
            {personalWins}
          </div>
          <div className="mt-0.5 text-[10px] font-semibold tracking-[.1em] text-muted">
            VINSTER
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-[10px] font-extrabold tracking-[.24em] text-sage">
          FLEST VINSTER
        </h2>
        <div className="flex flex-col">
          {rows.map((row, i) => (
            <div
              key={row.id}
              className="flex items-center gap-3 border-b border-white/5 py-2.5"
            >
              <span
                className={`w-6 text-center font-serif text-xl ${
                  i === 0 ? "text-gold-bright" : "text-paper-dim"
                }`}
              >
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-paper">{row.name}</div>
                <div className="text-xs text-muted">bästa {row.bestScore}</div>
              </div>
              <span className="font-serif text-2xl font-semibold text-paper tabular-nums">
                {row.wins}
              </span>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="text-sm text-muted-dim">Inga avslutade matcher ännu.</p>
          )}
        </div>
      </div>
    </div>
  );
}
