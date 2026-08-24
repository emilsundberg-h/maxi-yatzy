"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LuffarschackMatchView } from "@/components/luffarschack/LuffarschackMatchView";
import type { GameType } from "@/lib/domain/types";
import { getRepositories } from "@/lib/repositories";
import { YatzyMatchView } from "./YatzyMatchView";

// Thin dispatcher: learns which game this match is playing, then hands off
// to that game's own view/store entirely — Maxi Yatzy (useMatchStore, dice
// + scorecard) and Luffarschack (useLuffarschackStore, the grid board) are
// kept as two separate stores/views (see useLuffarschackStore.ts for why),
// so only one of them ever mounts for a given match instead of both loading
// in parallel.
export default function MatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [game, setGame] = useState<GameType>();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRepositories()
      .matches.getMatch(matchId)
      .then((match) => {
        if (cancelled) return;
        if (match) setGame(match.game);
        else setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (notFound) {
    return <div className="p-8 text-center text-red-400">Match not found</div>;
  }
  if (!game) {
    return <div className="p-8 text-center text-paper-dim">Laddar match…</div>;
  }
  return game === "luffarschack" ? (
    <LuffarschackMatchView matchId={matchId} />
  ) : (
    <YatzyMatchView matchId={matchId} />
  );
}
