import { create } from "zustand";
import {
  boardFromMoves,
  cellKey,
  checkWinner,
  symbolForPlayer,
  type PlacedMark,
} from "@/lib/domain/luffarschack";
import type { Match, Player } from "@/lib/domain/types";
import { getRepositories } from "@/lib/repositories";
import { toMatch, type MatchRow } from "@/lib/repositories/supabase/mappers";
import { createAuthedChannel } from "@/lib/supabase/authedChannel";

// Luffarschack's counterpart to useMatchStore — kept as its own store rather
// than folded into that one because there's no Luffarschack analogue to
// Yatzy's `turn`/`poolDeltaSoFar` (an in-progress roll to persist across
// refreshes): a placed mark is atomic, committed the instant it's tapped.
// The move log itself isn't held here — the gameplay page reads it straight
// off the already-realtime useActivityFeed hook
// (movesFromEvents(useActivityFeed(matchId))) and passes it into
// placeMark(), so this store only has to track `matches` UPDATEs, same
// turn-boundary signal useMatchStore reacts to.

interface LuffarschackStoreState {
  match?: Match;
  players: Record<string, Player>;
  loading: boolean;
  error?: string;

  loadMatch: (matchId: string) => Promise<void>;
  refreshMatch: (matchId: string) => Promise<void>;
  subscribeToMatch: (matchId: string) => () => void;
  placeMark: (x: number, y: number, moves: PlacedMark[]) => Promise<void>;
  reset: () => void;
}

export const useLuffarschackStore = create<LuffarschackStoreState>((set, get) => ({
  match: undefined,
  players: {},
  loading: false,
  error: undefined,

  async loadMatch(matchId) {
    set({ loading: true, error: undefined });
    const repos = getRepositories();
    const match = await repos.matches.getMatch(matchId);
    if (!match) {
      set({ loading: false, error: "Match not found" });
      return;
    }
    const playerRecords = await Promise.all(
      match.playerIds.map((id) => repos.players.getPlayer(id)),
    );
    const players: Record<string, Player> = {};
    for (const p of playerRecords) if (p) players[p.id] = p;

    set({ match, players, loading: false });

    if (match.status === "in_progress") {
      await repos.activity.append({
        matchId: match.id,
        playerId: match.playerIds[match.currentPlayerIndex],
        turnNumber: match.currentTurnNumber,
        type: "turn_started",
        payload: null,
      });
    }
  },

  // Pull-to-refresh — deliberately not loadMatch(): that also appends a
  // fresh "turn_started" activity event every call, which would spam the
  // feed on repeated refreshes. Moves themselves need no refresh here —
  // the gameplay page reads them live off useActivityFeed already.
  async refreshMatch(matchId) {
    const repos = getRepositories();
    const match = await repos.matches.getMatch(matchId);
    if (!match) return;
    const playerRecords = await Promise.all(
      match.playerIds.map((id) => repos.players.getPlayer(id)),
    );
    const players: Record<string, Player> = {};
    for (const p of playerRecords) if (p) players[p.id] = p;
    set({ match, players });
  },

  subscribeToMatch(matchId) {
    return createAuthedChannel(`luffarschack-store:${matchId}`, (channel) => {
      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        (payload) => {
          set({ match: toMatch(payload.new as MatchRow) });
        },
      );
    });
  },

  async placeMark(x, y, moves) {
    const { match } = get();
    if (!match || match.status !== "in_progress") return;
    if (boardFromMoves(moves).has(cellKey(x, y))) return;

    const activePlayerId = match.playerIds[match.currentPlayerIndex];
    const mark = symbolForPlayer(match.playerIds, activePlayerId);
    const repos = getRepositories();

    await repos.activity.append({
      matchId: match.id,
      playerId: activePlayerId,
      turnNumber: match.currentTurnNumber,
      type: "mark_placed",
      payload: { x, y, mark },
    });

    const nextMoves = [...moves, { x, y, mark, playerId: activePlayerId }];
    const win = checkWinner(nextMoves);

    let nextMatch: Match;
    if (win) {
      nextMatch = {
        ...match,
        status: "completed",
        completedAt: new Date().toISOString(),
        winnerPlayerId: win.winnerPlayerId,
      };
    } else {
      const nextIndex = (match.currentPlayerIndex + 1) % match.playerIds.length;
      const nextTurnNumber =
        nextIndex === 0 ? match.currentTurnNumber + 1 : match.currentTurnNumber;
      nextMatch = {
        ...match,
        currentPlayerIndex: nextIndex,
        currentTurnNumber: nextTurnNumber,
      };
    }
    await repos.matches.updateMatch(nextMatch);
    set({ match: nextMatch });

    if (nextMatch.status === "in_progress") {
      await repos.activity.append({
        matchId: nextMatch.id,
        playerId: nextMatch.playerIds[nextMatch.currentPlayerIndex],
        turnNumber: nextMatch.currentTurnNumber,
        type: "turn_started",
        payload: null,
      });

      // Best-effort "it's your turn" push, same fire-and-forget pattern as
      // useMatchStore.score() — no-op server-side for shared-device matches
      // or a player without a linked account.
      if (nextMatch.mode === "separate-devices") {
        fetch("/api/matches/notify-turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId: nextMatch.id,
            playerId: nextMatch.playerIds[nextMatch.currentPlayerIndex],
            turnNumber: nextMatch.currentTurnNumber,
          }),
        }).catch(() => {});
      }
    }
  },

  reset() {
    set({ match: undefined, players: {}, loading: false, error: undefined });
  },
}));
