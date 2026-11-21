import type { ActivityEvent } from "./types";

// Luffarschack — two players alternate placing a mark (kryss ✕ / ring ○) on
// an unbounded squared-paper grid; first to get LUFFARSCHACK_WIN_LENGTH
// marks in a row (any of the 4 axes) wins. There's no "board" row in the
// database — every placed mark is persisted as a "mark_placed" activity
// event (see lib/domain/types.ts), and the board is just that event log
// replayed client-side. That mirrors how Yatzy already treats `activity` as
// an append-only log and derives display state (ActivityFeed) from it.

export type Mark = "kryss" | "ring";

export interface PlacedMark {
  x: number;
  y: number;
  mark: Mark;
  playerId: string;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const LUFFARSCHACK_WIN_LENGTH = 5;
// How much empty room to keep beyond the outermost placed mark before the
// visible board needs to grow further — recomputed fresh from computeBounds
// on every render, so there's no explicit "grow" event to fire.
export const LUFFARSCHACK_MARGIN = 3;
// Smallest board shown even when empty or barely started, so the very first
// move doesn't render as a tiny few-cell grid.
export const LUFFARSCHACK_MIN_VIEWPORT = 15;

// kryss (✕) is always playerIds[0] and always opens; ring (○) is
// playerIds[1]. Fixed at match creation — see createMatch in
// lib/repositories/{supabase,indexeddb}/matches.ts, which also seeds
// current_player_index at 0 for this game instead of Yatzy's random start.
export function symbolForPlayer(playerIds: string[], playerId: string): Mark {
  return playerIds[0] === playerId ? "kryss" : "ring";
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function movesFromEvents(events: ActivityEvent[]): PlacedMark[] {
  return events
    .filter((event) => event.type === "mark_placed")
    .map((event) => {
      const payload = event.payload as { x: number; y: number; mark: Mark };
      return { x: payload.x, y: payload.y, mark: payload.mark, playerId: event.playerId };
    });
}

// Sparse — the grid is conceptually unbounded, so a dense 2D array would
// waste memory and can't even be sized up front. Keyed by cellKey(x, y).
export function boardFromMoves(moves: PlacedMark[]): Map<string, PlacedMark> {
  const board = new Map<string, PlacedMark>();
  for (const move of moves) board.set(cellKey(move.x, move.y), move);
  return board;
}

function emptyBounds(): Bounds {
  const half = Math.floor(LUFFARSCHACK_MIN_VIEWPORT / 2);
  return { minX: -half, maxX: half, minY: -half, maxY: half };
}

// Pads a too-small box up to LUFFARSCHACK_MIN_VIEWPORT on each axis,
// distributing the extra room evenly around what's already there.
function growToMinSize(bounds: Bounds): Bounds {
  let { minX, maxX, minY, maxY } = bounds;
  const widthDeficit = LUFFARSCHACK_MIN_VIEWPORT - (maxX - minX + 1);
  if (widthDeficit > 0) {
    const left = Math.ceil(widthDeficit / 2);
    minX -= left;
    maxX += widthDeficit - left;
  }
  const heightDeficit = LUFFARSCHACK_MIN_VIEWPORT - (maxY - minY + 1);
  if (heightDeficit > 0) {
    const top = Math.ceil(heightDeficit / 2);
    minY -= top;
    maxY += heightDeficit - top;
  }
  return { minX, maxX, minY, maxY };
}

// The visible window: tightest box around every placed mark, padded by
// `margin` on every side, never smaller than LUFFARSCHACK_MIN_VIEWPORT.
// Called fresh after every move — placing a mark near the current edge
// simply results in a bigger box next render, no separate "expand" step.
export function computeBounds(
  moves: PlacedMark[],
  margin: number = LUFFARSCHACK_MARGIN,
): Bounds {
  if (moves.length === 0) return emptyBounds();
  const xs = moves.map((m) => m.x);
  const ys = moves.map((m) => m.y);
  return growToMinSize({
    minX: Math.min(...xs) - margin,
    maxX: Math.max(...xs) + margin,
    minY: Math.min(...ys) - margin,
    maxY: Math.max(...ys) + margin,
  });
}

export interface WinResult {
  winnerMark: Mark;
  winnerPlayerId: string;
  // The exact contiguous run that won — length >= winLength (an overline
  // still wins and is highlighted in full, it's not truncated to 5).
  cells: PlacedMark[];
}

// The 4 axes a line can run along; each pair only needs to be walked in one
// direction (dx,dy) and its opposite, not all 8 compass directions.
const AXES: ReadonlyArray<readonly [number, number]> = [
  [1, 0], // horizontal
  [0, 1], // vertical
  [1, 1], // diagonal ↘
  [1, -1], // diagonal ↗
];

// Only checks the line(s) running through the *last* placed mark — a move
// can only ever complete a line it's part of, so rescanning the whole board
// on every placement would be wasted work as a match grows to hundreds of
// moves. Pass the full ordered move list (the winning move last).
export function checkWinner(
  moves: PlacedMark[],
  winLength: number = LUFFARSCHACK_WIN_LENGTH,
): WinResult | undefined {
  if (moves.length === 0) return undefined;
  const last = moves[moves.length - 1];
  const board = boardFromMoves(moves);

  for (const [dx, dy] of AXES) {
    const cells = [last];
    for (let step = 1; ; step++) {
      const cell = board.get(cellKey(last.x + dx * step, last.y + dy * step));
      if (!cell || cell.mark !== last.mark) break;
      cells.push(cell);
    }
    for (let step = 1; ; step++) {
      const cell = board.get(cellKey(last.x - dx * step, last.y - dy * step));
      if (!cell || cell.mark !== last.mark) break;
      cells.unshift(cell);
    }
    if (cells.length >= winLength) {
      return { winnerMark: last.mark, winnerPlayerId: last.playerId, cells };
    }
  }
  return undefined;
}

// Whose turn it is next, derived purely from how many marks are already on
// the board — kryss opens, then it alternates. Matches the
// current_player_index bookkeeping the store persists on the match row.
export function nextTurnPlayerId(playerIds: string[], moves: PlacedMark[]): string {
  return playerIds[moves.length % 2];
}
