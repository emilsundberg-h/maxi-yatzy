"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PullToRefreshIndicator } from "@/components/dashboard/PullToRefreshIndicator";
import { ActivityFeed } from "@/components/match/ActivityFeed";
import { WinnerModal } from "@/components/match/WinnerModal";
import { checkWinner, movesFromEvents, symbolForPlayer } from "@/lib/domain/luffarschack";
import { playerBelongsToUser } from "@/lib/domain/players";
import { useActivityFeed } from "@/lib/hooks/useActivityFeed";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useLuffarschackStore } from "@/lib/store/useLuffarschackStore";
import { Board } from "./Board";

export function LuffarschackMatchView({ matchId }: { matchId: string }) {
  const { match, players, loading, error, loadMatch, refreshMatch, subscribeToMatch, placeMark, reset } =
    useLuffarschackStore();
  const authUserId = useAuthStore((s) => s.user?.id);
  const events = useActivityFeed(match?.id);
  const moves = movesFromEvents(events);
  const {
    pullDistance,
    refreshing: pullRefreshing,
    threshold: pullThreshold,
  } = usePullToRefresh(() => refreshMatch(matchId));
  const [trackedStatus, setTrackedStatus] = useState(match?.status);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  // Fires once, right when the match is decided — trackedStatus !==
  // undefined skips the initial load of an already-finished match, which
  // shouldn't replay the celebration. Same pattern as YatzyMatchView.
  if (match && match.status !== trackedStatus) {
    const justCompleted = match.status === "completed" && trackedStatus !== undefined;
    setTrackedStatus(match.status);
    if (justCompleted) setShowWinnerModal(true);
  }

  useEffect(() => {
    loadMatch(matchId);
    const unsubscribe = subscribeToMatch(matchId);
    return () => {
      unsubscribe();
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  function withPullToRefresh(children: React.ReactNode) {
    return (
      <div className="relative flex-1">
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          refreshing={pullRefreshing}
          threshold={pullThreshold}
        />
        <div
          style={{
            transform: `translateY(${pullRefreshing ? pullThreshold : pullDistance}px)`,
            transition:
              pullRefreshing || pullDistance === 0 ? "transform 200ms ease-out" : undefined,
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  if (loading || !match) {
    return withPullToRefresh(
      <div className="p-8 text-center text-paper-dim">Laddar match…</div>,
    );
  }
  if (error) {
    return withPullToRefresh(<div className="p-8 text-center text-red-400">{error}</div>);
  }

  const activePlayerId = match.playerIds[match.currentPlayerIndex];
  const activePlayerName = players[activePlayerId]?.name ?? "Spelare";
  const isLocalPlayersTurn =
    match.mode === "shared-device" || playerBelongsToUser(players[activePlayerId], authUserId);
  const symbolLabel = (playerId: string) =>
    symbolForPlayer(match.playerIds, playerId) === "kryss" ? "✕" : "○";

  if (match.status === "completed") {
    const win = checkWinner(moves);
    const winnerId = match.winnerPlayerId;
    return withPullToRefresh(
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 p-4 sm:p-8">
        {showWinnerModal && winnerId && (
          <WinnerModal
            winnerName={players[winnerId]?.name ?? "Spelare"}
            subtitle="med fem i rad"
            ctaLabel="VISA BRÄDET"
            onClose={() => setShowWinnerModal(false)}
          />
        )}
        <div className="text-[10px] font-extrabold tracking-[.24em] text-gold">
          MATCH AVSLUTAD
        </div>
        <h1 className="max-w-full truncate px-4 text-center font-serif text-4xl font-semibold text-paper">
          {winnerId ? `${players[winnerId]?.name ?? "–"} vann!` : "Match klar"}
        </h1>
        {match.forfeitedByPlayerId && (
          <p className="text-xs text-muted-dim">
            {players[match.forfeitedByPlayerId]?.name ?? "Spelaren"} gav upp matchen.
          </p>
        )}
        <Board moves={moves} winningCells={win?.cells} interactive={false} />
        <Link
          href="/"
          className="rounded-2xl px-6 py-3 font-extrabold tracking-[.08em] text-[var(--color-ink)] shadow-[0_12px_26px_rgba(0,0,0,.4)]"
          style={{ background: "var(--color-accent-grad)" }}
        >
          TILL MATCHER
        </Link>
      </div>,
    );
  }

  // Unlike Yatzy's pass-and-play handoff (which gates a private dice
  // roll/scoring choice behind "hand the phone over" first), Luffarschack
  // has nothing to hide between turns — the board itself stays visible and
  // interactive the whole time; only who's allowed to tap next changes.
  return withPullToRefresh(
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 p-2 sm:p-4">
      <div className="flex w-full items-center justify-between">
        <Link
          href="/"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-surface text-sm text-gold-bright"
        >
          ‹
        </Link>
        <div className="text-[10px] font-extrabold tracking-[.24em] text-gold">LUFFARSCHACK</div>
        <span className="w-7" />
      </div>

      <div className="flex w-full items-center justify-center gap-6 text-sm">
        {match.playerIds.map((id) => (
          <div
            key={id}
            className="flex items-center gap-1.5 font-semibold"
            style={{ opacity: id === activePlayerId ? 1 : 0.5 }}
          >
            <span
              style={{
                color:
                  symbolForPlayer(match.playerIds, id) === "kryss"
                    ? "var(--color-gold-bright)"
                    : "var(--color-paper)",
              }}
            >
              {symbolLabel(id)}
            </span>
            <span className="text-paper">{players[id]?.name ?? "Spelare"}</span>
          </div>
        ))}
      </div>

      <div className="text-center text-[11px] font-bold tracking-[.15em] text-gold-bright">
        {isLocalPlayersTurn ? "DIN TUR" : `${activePlayerName}S TUR`} · {symbolLabel(activePlayerId)}
      </div>

      <Board
        moves={moves}
        interactive={isLocalPlayersTurn}
        onPlaceMark={(x, y) => placeMark(x, y, moves)}
      />

      {match.mode === "separate-devices" && (
        <ActivityFeed events={events} players={players} game="luffarschack" />
      )}
    </div>,
  );
}
