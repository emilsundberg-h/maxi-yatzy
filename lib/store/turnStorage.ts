import type { TurnState } from "@/lib/domain/turn";

// Persists the in-progress turn (dice/locks/rolls) that only ever lived in
// memory otherwise. Without this, force-closing the app after a bad roll and
// reopening it would silently hand back a fresh 3-roll turn — an easy way to
// cheat the roll limit. Keyed by match + exactly which turn it belongs to, so
// a stale entry from a finished turn can never be mistaken for the current one.
interface StoredTurn {
  currentPlayerIndex: number;
  currentTurnNumber: number;
  turn: TurnState;
  poolDeltaSoFar: number;
}

function storageKey(matchId: string): string {
  return `maxi-yatzy:turn:${matchId}`;
}

export function saveTurnToStorage(
  matchId: string,
  currentPlayerIndex: number,
  currentTurnNumber: number,
  turn: TurnState,
  poolDeltaSoFar: number,
): void {
  if (typeof window === "undefined") return;
  try {
    const entry: StoredTurn = { currentPlayerIndex, currentTurnNumber, turn, poolDeltaSoFar };
    window.localStorage.setItem(storageKey(matchId), JSON.stringify(entry));
  } catch {
    // Storage unavailable/full/blocked (private mode etc.) — the turn just
    // won't survive a reload, which is the pre-existing behavior anyway.
  }
}

// Only returns a turn if it actually belongs to the match's current turn —
// a stored turn from before someone else scored (or before this player's
// last turn) must never be resurrected.
export function loadTurnFromStorage(
  matchId: string,
  currentPlayerIndex: number,
  currentTurnNumber: number,
): { turn: TurnState; poolDeltaSoFar: number } | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(storageKey(matchId));
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as StoredTurn;
    if (
      entry.currentPlayerIndex !== currentPlayerIndex ||
      entry.currentTurnNumber !== currentTurnNumber ||
      entry.turn.rollsUsedThisTurn <= 0
    ) {
      return undefined;
    }
    return { turn: entry.turn, poolDeltaSoFar: entry.poolDeltaSoFar };
  } catch {
    return undefined;
  }
}

export function clearTurnStorage(matchId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(matchId));
  } catch {
    // Nothing to do — worst case a stale entry lingers, and it can never
    // match again once currentPlayerIndex/currentTurnNumber move on.
  }
}
