import { create } from "zustand";
import { scoreCategory } from "@/lib/domain/categories";
import { isScoreSheetComplete } from "@/lib/domain/scoring";
import {
  canRoll as engineCanRoll,
  rollTurn,
  scoreAndEndTurn,
  startTurn,
  toggleDieLock,
  type TurnState,
} from "@/lib/domain/turn";
import type { CategoryId, Match, MatchPlayer, Player } from "@/lib/domain/types";
import { getRepositories } from "@/lib/repositories";
import { toMatch, toMatchPlayer, type MatchPlayerRow, type MatchRow } from "@/lib/repositories/supabase/mappers";
import { createAuthedChannel } from "@/lib/supabase/authedChannel";
import { clearTurnStorage, loadTurnFromStorage, saveTurnToStorage } from "@/lib/store/turnStorage";

interface MatchStoreState {
  match?: Match;
  matchPlayers: MatchPlayer[];
  players: Record<string, Player>;
  turn: TurnState;
  poolDeltaSoFar: number;
  loading: boolean;
  error?: string;

  loadMatch: (matchId: string) => Promise<void>;
  refreshMatch: (matchId: string) => Promise<void>;
  subscribeToMatch: (matchId: string) => () => void;
  roll: () => Promise<void>;
  toggleLock: (index: number) => void;
  score: (categoryId: CategoryId) => Promise<void>;
  reset: () => void;
}

function currentPlayerId(match: Match): string {
  return match.playerIds[match.currentPlayerIndex];
}

export const useMatchStore = create<MatchStoreState>((set, get) => ({
  match: undefined,
  matchPlayers: [],
  players: {},
  turn: startTurn(),
  poolDeltaSoFar: 0,
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
    const matchPlayers = await repos.matches.listMatchPlayers(matchId);
    const playerRecords = await Promise.all(
      match.playerIds.map((id) => repos.players.getPlayer(id)),
    );
    const players: Record<string, Player> = {};
    for (const p of playerRecords) if (p) players[p.id] = p;

    const stored = loadTurnFromStorage(
      match.id,
      match.currentPlayerIndex,
      match.currentTurnNumber,
    );

    set({
      match,
      matchPlayers,
      players,
      turn: stored?.turn ?? startTurn(match.lastDice),
      poolDeltaSoFar: stored?.poolDeltaSoFar ?? 0,
      loading: false,
    });

    if (match.status === "in_progress") {
      await repos.activity.append({
        matchId: match.id,
        playerId: currentPlayerId(match),
        turnNumber: match.currentTurnNumber,
        type: "turn_started",
        payload: null,
      });
    }
  },

  // Pull-to-refresh while a match is open. Deliberately not the same as
  // loadMatch: this must never clobber dice/locks/rolls the player has
  // already made this turn but not yet scored. Only resets `turn` when the
  // fetched match shows the turn has genuinely moved on server-side —
  // same isNewTurn guard subscribeToMatch already uses for the same reason.
  async refreshMatch(matchId) {
    const repos = getRepositories();
    const [match, matchPlayers] = await Promise.all([
      repos.matches.getMatch(matchId),
      repos.matches.listMatchPlayers(matchId),
    ]);
    if (!match) return;
    const playerRecords = await Promise.all(
      match.playerIds.map((id) => repos.players.getPlayer(id)),
    );
    const players: Record<string, Player> = {};
    for (const p of playerRecords) if (p) players[p.id] = p;

    set((state) => {
      const isNewTurn =
        !state.match ||
        state.match.currentPlayerIndex !== match.currentPlayerIndex ||
        state.match.currentTurnNumber !== match.currentTurnNumber ||
        state.match.status !== match.status;
      if (isNewTurn) clearTurnStorage(matchId);
      return {
        match,
        matchPlayers,
        players,
        ...(isNewTurn ? { turn: startTurn(match.lastDice), poolDeltaSoFar: 0 } : {}),
      };
    });
  },

  subscribeToMatch(matchId) {
    return createAuthedChannel(`match-store:${matchId}`, (channel) => {
      channel
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
          (payload) => {
            const incoming = toMatch(payload.new as MatchRow);
            set((state) => {
              // A `matches` row only ever changes at a turn boundary (or match
              // completion) — never mid-turn — so this is the exact signal
              // that the local `turn` (dice/locks/rolls) should reset. Only
              // reset when the turn actually changed: without this guard, the
              // acting client's own write would echo back over Realtime and
              // could clobber a turn it had already started rolling on.
              const isNewTurn =
                !state.match ||
                state.match.currentPlayerIndex !== incoming.currentPlayerIndex ||
                state.match.currentTurnNumber !== incoming.currentTurnNumber ||
                state.match.status !== incoming.status;
              if (isNewTurn) clearTurnStorage(matchId);
              return {
                match: incoming,
                ...(isNewTurn
                  ? { turn: startTurn(incoming.lastDice), poolDeltaSoFar: 0 }
                  : {}),
              };
            });
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "match_players", filter: `match_id=eq.${matchId}` },
          (payload) => {
            const row = (payload.new ?? payload.old) as MatchPlayerRow;
            const updated = toMatchPlayer(row);
            set((state) => ({
              matchPlayers: state.matchPlayers.some((mp) => mp.playerId === updated.playerId)
                ? state.matchPlayers.map((mp) =>
                    mp.playerId === updated.playerId ? updated : mp,
                  )
                : [...state.matchPlayers, updated],
            }));
          },
        );
    });
  },

  async roll() {
    const { match, matchPlayers, turn, poolDeltaSoFar } = get();
    if (!match) return;
    const mp = matchPlayers.find((p) => p.playerId === currentPlayerId(match));
    if (!mp) return;
    const poolNow = mp.pool + poolDeltaSoFar;
    if (!engineCanRoll(turn, poolNow)) return;

    const { state, poolDelta } = rollTurn(turn, poolNow);
    const nextPoolDeltaSoFar = poolDeltaSoFar + poolDelta;
    set({ turn: state, poolDeltaSoFar: nextPoolDeltaSoFar });
    saveTurnToStorage(
      match.id,
      match.currentPlayerIndex,
      match.currentTurnNumber,
      state,
      nextPoolDeltaSoFar,
    );

    const repos = getRepositories();
    await repos.activity.append({
      matchId: match.id,
      playerId: currentPlayerId(match),
      turnNumber: match.currentTurnNumber,
      type: poolDelta < 0 ? "roll_borrowed" : "roll",
      payload: { dice: state.dice, rollsUsedThisTurn: state.rollsUsedThisTurn },
    });
  },

  toggleLock(index) {
    const { match, turn, poolDeltaSoFar } = get();
    if (turn.rollsUsedThisTurn === 0) return;
    const nextTurn = toggleDieLock(turn, index);
    set({ turn: nextTurn });

    if (match) {
      saveTurnToStorage(
        match.id,
        match.currentPlayerIndex,
        match.currentTurnNumber,
        nextTurn,
        poolDeltaSoFar,
      );
      const repos = getRepositories();
      void repos.activity.append({
        matchId: match.id,
        playerId: currentPlayerId(match),
        turnNumber: match.currentTurnNumber,
        type: "lock_toggle",
        payload: { index, locked: nextTurn.locked[index] },
      });
    }
  },

  async score(categoryId) {
    const { match, matchPlayers, players, turn, poolDeltaSoFar } = get();
    if (!match) return;
    const mp = matchPlayers.find((p) => p.playerId === currentPlayerId(match));
    if (!mp) return;
    if (mp.scores[categoryId] !== undefined) return;
    if (turn.rollsUsedThisTurn === 0) return;

    const points = scoreCategory(categoryId, turn.dice);
    const { bankedGain } = scoreAndEndTurn(turn);
    const updatedMp: MatchPlayer = {
      ...mp,
      scores: { ...mp.scores, [categoryId]: points },
      pool: mp.pool + poolDeltaSoFar + bankedGain,
    };

    const repos = getRepositories();
    await repos.matches.updateMatchPlayer(updatedMp);
    await repos.activity.append({
      matchId: match.id,
      playerId: currentPlayerId(match),
      turnNumber: match.currentTurnNumber,
      type: "category_scored",
      payload: { categoryId, points, dice: turn.dice },
    });
    if (bankedGain > 0) {
      await repos.activity.append({
        matchId: match.id,
        playerId: currentPlayerId(match),
        turnNumber: match.currentTurnNumber,
        type: "roll_banked",
        payload: { bankedGain },
      });
    }

    const nextMatchPlayers = matchPlayers.map((p) =>
      p.playerId === updatedMp.playerId ? updatedMp : p,
    );
    const allComplete = nextMatchPlayers.every((p) =>
      isScoreSheetComplete(p.scores),
    );

    // One shared set of dice on the table: whoever's turn is next picks up
    // however this turn's dice were left, not their own dice from turns ago.
    let nextMatch: Match;
    if (allComplete) {
      nextMatch = {
        ...match,
        status: "completed",
        completedAt: new Date().toISOString(),
        lastDice: turn.dice,
      };
    } else {
      const nextIndex = (match.currentPlayerIndex + 1) % match.playerIds.length;
      const nextTurnNumber =
        nextIndex === 0 ? match.currentTurnNumber + 1 : match.currentTurnNumber;
      nextMatch = {
        ...match,
        currentPlayerIndex: nextIndex,
        currentTurnNumber: nextTurnNumber,
        lastDice: turn.dice,
      };
    }
    await repos.matches.updateMatch(nextMatch);
    clearTurnStorage(match.id);

    set({
      match: nextMatch,
      matchPlayers: nextMatchPlayers,
      players,
      turn: startTurn(nextMatch.lastDice),
      poolDeltaSoFar: 0,
    });

    if (nextMatch.status === "in_progress") {
      await repos.activity.append({
        matchId: nextMatch.id,
        playerId: currentPlayerId(nextMatch),
        turnNumber: nextMatch.currentTurnNumber,
        type: "turn_started",
        payload: null,
      });

      // Best-effort "it's your turn" push for the player we just handed off
      // to. Fire-and-forget: never blocks the UI, and the route itself is a
      // no-op for shared-device matches / players without a linked account.
      if (nextMatch.mode === "separate-devices") {
        fetch("/api/matches/notify-turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId: nextMatch.id,
            playerId: currentPlayerId(nextMatch),
            turnNumber: nextMatch.currentTurnNumber,
          }),
        }).catch(() => {});
      }
    }
  },

  reset() {
    set({
      match: undefined,
      matchPlayers: [],
      players: {},
      turn: startTurn(),
      poolDeltaSoFar: 0,
      loading: false,
      error: undefined,
    });
  },
}));
