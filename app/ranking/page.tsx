"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { totalScore } from "@/lib/domain/scoring";
import type { Player } from "@/lib/domain/types";
import { getRepositories } from "@/lib/repositories";
import { usePlayersStore } from "@/lib/store/usePlayersStore";

interface RankingRow {
  playerId: string;
  wins: number;
  bestScore: number;
}

export default function RankingPage() {
  const { players, localPlayerId, load, loaded } = usePlayersStore();
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [globalHigh, setGlobalHigh] = useState<
    { playerId: string; score: number } | undefined
  >();
  const [personalHigh, setPersonalHigh] = useState<number | undefined>();

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!loaded) return;
    async function compute() {
      const repos = getRepositories();
      const matches = await repos.matches.listMatches({ status: "completed" });
      const winsByPlayer: Record<string, number> = {};
      const bestByPlayer: Record<string, number> = {};
      let best: { playerId: string; score: number } | undefined;
      let myBest: number | undefined;

      for (const match of matches) {
        const mps = await repos.matches.listMatchPlayers(match.id);
        // Whoever forfeited is excluded from winning this match (even on a
        // tied or highest score) but their actual score still counts
        // toward personal-best / all-time-high stats below.
        const eligible = match.forfeitedByPlayerId
          ? mps.filter((mp) => mp.playerId !== match.forfeitedByPlayerId)
          : mps;
        const contenders = eligible.length > 0 ? eligible : mps;
        const topScore = Math.max(...contenders.map((mp) => totalScore(mp.scores)));
        for (const mp of mps) {
          const s = totalScore(mp.scores);
          bestByPlayer[mp.playerId] = Math.max(bestByPlayer[mp.playerId] ?? 0, s);
          if (!best || s > best.score) best = { playerId: mp.playerId, score: s };
          if (localPlayerId && mp.playerId === localPlayerId) {
            myBest = myBest === undefined ? s : Math.max(myBest, s);
          }
        }
        for (const mp of contenders) {
          if (totalScore(mp.scores) === topScore) {
            winsByPlayer[mp.playerId] = (winsByPlayer[mp.playerId] ?? 0) + 1;
          }
        }
      }

      const playerIds = new Set([
        ...Object.keys(winsByPlayer),
        ...Object.keys(bestByPlayer),
      ]);
      const nextRows = [...playerIds].map((playerId) => ({
        playerId,
        wins: winsByPlayer[playerId] ?? 0,
        bestScore: bestByPlayer[playerId] ?? 0,
      }));
      nextRows.sort((a, b) => b.wins - a.wins || b.bestScore - a.bestScore);
      setRows(nextRows);
      setGlobalHigh(best);
      setPersonalHigh(myBest);
    }
    compute();
  }, [loaded, localPlayerId]);

  const playersById: Record<string, Player> = Object.fromEntries(
    players.map((p) => [p.id, p]),
  );

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
              <div className="text-sm font-bold text-paper">
                {playersById[globalHigh.playerId]?.name ?? "?"}
              </div>
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
            {rows.find((r) => r.playerId === localPlayerId)?.wins ?? 0}
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
              key={row.playerId}
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
                <div className="text-sm font-semibold text-paper">
                  {playersById[row.playerId]?.name ?? "?"}
                </div>
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
