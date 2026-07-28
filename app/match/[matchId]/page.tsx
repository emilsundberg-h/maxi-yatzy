"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DiceColumn } from "@/components/dice/DiceColumn";
import { ROLL_MAX_DURATION_S } from "@/components/dice/Die";
import { ActivityFeed } from "@/components/match/ActivityFeed";
import { RollControls } from "@/components/match/RollControls";
import { WinnerModal } from "@/components/match/WinnerModal";
import { ScorecardGrid } from "@/components/scorecard/ScorecardGrid";
import { scoreCategory } from "@/lib/domain/categories";
import { totalScore } from "@/lib/domain/scoring";
import { canRoll as engineCanRoll } from "@/lib/domain/turn";
import { ALL_CATEGORY_IDS } from "@/lib/domain/types";
import { useActivityFeed } from "@/lib/hooks/useActivityFeed";
import { useMatchStore } from "@/lib/store/useMatchStore";
import { usePlayersStore } from "@/lib/store/usePlayersStore";
import { getProfiles, type Profile } from "@/lib/supabase/profiles";

// A little longer than the dice's own longest possible roll animation
// (see ROLL_MAX_DURATION_S in Die.tsx), so the scorecard preview never
// reveals a result before the dice visually finish tumbling.
const DICE_SETTLE_DELAY_MS = ROLL_MAX_DURATION_S * 1000 + 60;

export default function MatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const {
    match,
    matchPlayers,
    players,
    turn,
    poolDeltaSoFar,
    loading,
    error,
    loadMatch,
    subscribeToMatch,
    roll,
    toggleLock,
    score,
    reset,
  } = useMatchStore();
  const localPlayerId = usePlayersStore((s) => s.localPlayerId);
  const events = useActivityFeed(match?.id);
  const [handoffAcknowledged, setHandoffAcknowledged] = useState(false);
  const [profilesByUserId, setProfilesByUserId] = useState<Record<string, Profile>>({});
  const [diceSettled, setDiceSettled] = useState(true);
  const [trackedRollCount, setTrackedRollCount] = useState(turn.rollsUsedThisTurn);
  const [trackedStatus, setTrackedStatus] = useState(match?.status);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [trackedDiceSettled, setTrackedDiceSettled] = useState(diceSettled);

  const turnKey = match ? `${match.currentPlayerIndex}:${match.currentTurnNumber}` : undefined;
  const [trackedTurnKey, setTrackedTurnKey] = useState(turnKey);
  if (turnKey !== trackedTurnKey) {
    setTrackedTurnKey(turnKey);
    setHandoffAcknowledged(false);
    setDiceSettled(true);
  }

  if (turn.rollsUsedThisTurn !== trackedRollCount) {
    setTrackedRollCount(turn.rollsUsedThisTurn);
    if (turn.rollsUsedThisTurn > 0) setDiceSettled(false);
  }

  // Fires once, right when the last score of the match gets locked in —
  // `trackedStatus !== undefined` skips the initial load of an
  // already-finished match, which shouldn't replay the celebration.
  if (match && match.status !== trackedStatus) {
    const justCompleted = match.status === "completed" && trackedStatus !== undefined;
    setTrackedStatus(match.status);
    if (justCompleted) setShowWinnerModal(true);
  }

  useEffect(() => {
    if (diceSettled) return;
    const timeout = setTimeout(() => setDiceSettled(true), DICE_SETTLE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [diceSettled]);

  useEffect(() => {
    if (!shaking) return;
    const timeout = setTimeout(() => setShaking(false), 1000);
    return () => clearTimeout(timeout);
  }, [shaking]);

  useEffect(() => {
    loadMatch(matchId);
    const unsubscribe = subscribeToMatch(matchId);
    return () => {
      unsubscribe();
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  useEffect(() => {
    const userIds = [
      ...new Set(Object.values(players).map((p) => p.linkedUserId).filter((id): id is string => !!id)),
    ];
    if (userIds.length === 0) return;
    getProfiles(userIds).then(setProfilesByUserId);
  }, [players]);

  if (loading || !match) {
    return <div className="flex-1 p-8 text-center text-paper-dim">Laddar match…</div>;
  }
  if (error) {
    return <div className="flex-1 p-8 text-center text-red-400">{error}</div>;
  }

  const activePlayerId = match.playerIds[match.currentPlayerIndex];
  const activeMatchPlayer = matchPlayers.find((mp) => mp.playerId === activePlayerId);
  const activePlayerName = players[activePlayerId]?.name ?? "Spelare";
  const pool = activeMatchPlayer ? activeMatchPlayer.pool + poolDeltaSoFar : 0;
  const isLocalPlayersTurn =
    match.mode === "shared-device" || activePlayerId === localPlayerId;
  const hasRolled = turn.rollsUsedThisTurn > 0;

  // Fires only on the render where the dice actually finish tumbling (the
  // settle timeout flipping this from false to true) — never on the render
  // that starts a roll, where `diceSettled` would still read its stale
  // pre-roll value.
  if (diceSettled !== trackedDiceSettled) {
    setTrackedDiceSettled(diceSettled);
    if (diceSettled && hasRolled && isLocalPlayersTurn && scoreCategory("maxiYatzy", turn.dice) > 0) {
      setShaking(true);
    }
  }

  if (match.status === "completed") {
    const ranked = [...matchPlayers].sort(
      (a, b) => totalScore(b.scores) - totalScore(a.scores),
    );
    const winnerId = ranked[0]?.playerId;
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-6 p-4 sm:p-8">
        {showWinnerModal && winnerId && (
          <WinnerModal
            winnerName={players[winnerId]?.name ?? "Spelare"}
            winnerScore={totalScore(ranked[0].scores)}
            onClose={() => setShowWinnerModal(false)}
          />
        )}
        <div className="text-[10px] font-extrabold tracking-[.24em] text-gold">
          MATCH AVSLUTAD
        </div>
        <h1 className="max-w-full truncate px-4 text-center font-serif text-4xl font-semibold text-paper">
          {winnerId ? `${players[winnerId]?.name ?? "–"} vann!` : "Match klar"}
        </h1>
        {winnerId && (
          <p className="text-sm text-paper-dim">
            med {totalScore(ranked[0].scores)} poäng
          </p>
        )}
        <div className="w-full">
          <ScorecardGrid
            matchPlayers={ranked}
            players={players}
            profiles={profilesByUserId}
            playerOrder={ranked.map((mp) => mp.playerId)}
            activePlayerId=""
            canScoreActivePlayer={false}
          />
        </div>
        <Link
          href="/"
          className="rounded-2xl px-6 py-3 font-extrabold tracking-[.08em] text-[#241708] shadow-[0_12px_26px_rgba(0,0,0,.4)]"
          style={{ background: "linear-gradient(150deg,#eecb7c,#b98d38)" }}
        >
          TILL MATCHER
        </Link>
      </div>
    );
  }

  if (match.mode === "shared-device" && !handoffAcknowledged) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-[11px] font-bold tracking-[.2em] text-sage">SKICKA ENHETEN TILL</p>
        <h1 className="max-w-full truncate font-serif text-4xl font-semibold text-paper sm:text-5xl">
          {activePlayerName}
        </h1>
        <p className="text-xs text-muted">
          Runda {match.currentTurnNumber}/{ALL_CATEGORY_IDS.length}
        </p>
        <button
          type="button"
          onClick={() => setHandoffAcknowledged(true)}
          className="mt-2 rounded-2xl px-8 py-4 text-[15px] font-extrabold tracking-[.08em] text-[#241708] shadow-[0_12px_26px_rgba(0,0,0,.4),inset_0_2px_0_rgba(255,255,255,.45)]"
          style={{ background: "linear-gradient(150deg,#eecb7c,#b98d38)" }}
        >
          JAG ÄR REDO
        </button>
      </div>
    );
  }

  return (
    <motion.div
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 p-3"
      animate={shaking ? { x: [0, -14, 14, -10, 10, -6, 6, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 1, ease: "easeInOut" }}
    >
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-gold/25 bg-white/5 text-sm text-gold-bright"
        >
          ‹
        </Link>
        <div className="text-center">
          <div className="text-[9px] font-bold tracking-[.2em] text-gold-bright">
            RUNDA {match.currentTurnNumber}/{ALL_CATEGORY_IDS.length} ·{" "}
            {isLocalPlayersTurn ? "DIN TUR" : `${activePlayerName}S TUR`}
          </div>
        </div>
        <div className="w-7" />
      </div>

      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <ScorecardGrid
            matchPlayers={matchPlayers}
            players={players}
            profiles={profilesByUserId}
            playerOrder={match.playerIds}
            activePlayerId={activePlayerId}
            previewDice={isLocalPlayersTurn && hasRolled && diceSettled ? turn.dice : undefined}
            canScoreActivePlayer={isLocalPlayersTurn && hasRolled && diceSettled}
            onScore={score}
          />
          {match.mode === "separate-devices" && (
            <div className="mt-4">
              <ActivityFeed events={events} players={players} />
            </div>
          )}
        </div>

        <div className="sticky top-2 flex w-[104px] flex-none flex-col items-center gap-2 rounded-2xl border border-gold/15 bg-black/25 px-2 pt-7 pb-3 sm:w-[130px] sm:px-3 sm:pt-8">
          {isLocalPlayersTurn ? (
            <>
              <DiceColumn
                dice={turn.dice}
                locked={turn.locked}
                rollsUsedThisTurn={turn.rollsUsedThisTurn}
                interactive
                onToggleLock={toggleLock}
                size={40}
              />
              <RollControls
                rollsUsedThisTurn={turn.rollsUsedThisTurn}
                pool={pool}
                canRoll={engineCanRoll(turn, pool) && diceSettled}
                onRoll={roll}
              />
            </>
          ) : (
            <p className="py-4 text-center text-[11px] text-paper-dim">
              Väntar på {activePlayerName}…
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
