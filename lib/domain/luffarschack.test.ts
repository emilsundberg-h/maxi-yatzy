import { describe, expect, it } from "vitest";
import {
  LUFFARSCHACK_MIN_VIEWPORT,
  boardFromMoves,
  cellKey,
  checkWinner,
  computeBounds,
  movesFromEvents,
  nextTurnPlayerId,
  symbolForPlayer,
  type PlacedMark,
} from "./luffarschack";
import type { ActivityEvent } from "./types";

const PLAYER_IDS = ["p-kryss", "p-ring"];

function mark(x: number, y: number, playerId: string): PlacedMark {
  return { x, y, mark: symbolForPlayer(PLAYER_IDS, playerId), playerId };
}

function line(
  count: number,
  start: [number, number],
  step: [number, number],
  playerId: string,
): PlacedMark[] {
  return Array.from({ length: count }, (_, i) =>
    mark(start[0] + step[0] * i, start[1] + step[1] * i, playerId),
  );
}

describe("symbolForPlayer", () => {
  it("assigns kryss to playerIds[0] and ring to playerIds[1]", () => {
    expect(symbolForPlayer(PLAYER_IDS, "p-kryss")).toBe("kryss");
    expect(symbolForPlayer(PLAYER_IDS, "p-ring")).toBe("ring");
  });
});

describe("nextTurnPlayerId", () => {
  it("alternates starting with playerIds[0]", () => {
    expect(nextTurnPlayerId(PLAYER_IDS, [])).toBe("p-kryss");
    expect(nextTurnPlayerId(PLAYER_IDS, [mark(0, 0, "p-kryss")])).toBe("p-ring");
    expect(
      nextTurnPlayerId(PLAYER_IDS, [mark(0, 0, "p-kryss"), mark(1, 0, "p-ring")]),
    ).toBe("p-kryss");
  });
});

describe("movesFromEvents", () => {
  it("filters to mark_placed events and preserves order", () => {
    const events: ActivityEvent[] = [
      {
        id: "1",
        matchId: "m1",
        playerId: "p-kryss",
        turnNumber: 1,
        type: "turn_started",
        payload: null,
        createdAt: "",
      },
      {
        id: "2",
        matchId: "m1",
        playerId: "p-kryss",
        turnNumber: 1,
        type: "mark_placed",
        payload: { x: 0, y: 0, mark: "kryss" },
        createdAt: "",
      },
      {
        id: "3",
        matchId: "m1",
        playerId: "p-ring",
        turnNumber: 2,
        type: "mark_placed",
        payload: { x: 1, y: 0, mark: "ring" },
        createdAt: "",
      },
    ];
    expect(movesFromEvents(events)).toEqual([
      { x: 0, y: 0, mark: "kryss", playerId: "p-kryss" },
      { x: 1, y: 0, mark: "ring", playerId: "p-ring" },
    ]);
  });
});

describe("boardFromMoves", () => {
  it("keys marks by cellKey(x, y)", () => {
    const moves = [mark(2, -3, "p-kryss")];
    const board = boardFromMoves(moves);
    expect(board.get(cellKey(2, -3))).toEqual(moves[0]);
    expect(board.size).toBe(1);
  });

  it("a later move at the same cell overwrites an earlier one", () => {
    const board = boardFromMoves([mark(0, 0, "p-kryss"), mark(0, 0, "p-ring")]);
    expect(board.get(cellKey(0, 0))?.playerId).toBe("p-ring");
  });
});

describe("computeBounds", () => {
  it("falls back to a centered minimum viewport when empty", () => {
    const bounds = computeBounds([]);
    expect(bounds.maxX - bounds.minX + 1).toBe(LUFFARSCHACK_MIN_VIEWPORT);
    expect(bounds.maxY - bounds.minY + 1).toBe(LUFFARSCHACK_MIN_VIEWPORT);
    expect(bounds.minX).toBe(-bounds.maxX);
  });

  it("still enforces the minimum viewport around a single mark near the margin", () => {
    const bounds = computeBounds([mark(0, 0, "p-kryss")]);
    expect(bounds.maxX - bounds.minX + 1).toBeGreaterThanOrEqual(LUFFARSCHACK_MIN_VIEWPORT);
    expect(bounds.maxY - bounds.minY + 1).toBeGreaterThanOrEqual(LUFFARSCHACK_MIN_VIEWPORT);
  });

  it("grows to occupied bounds plus margin once marks spread out", () => {
    const moves = [mark(-20, 0, "p-kryss"), mark(20, 0, "p-ring")];
    const bounds = computeBounds(moves, 3);
    expect(bounds.minX).toBe(-23);
    expect(bounds.maxX).toBe(23);
  });
});

describe("checkWinner", () => {
  it("detects a horizontal 5-in-a-row", () => {
    const moves = line(5, [0, 0], [1, 0], "p-kryss");
    const result = checkWinner(moves);
    expect(result?.winnerMark).toBe("kryss");
    expect(result?.winnerPlayerId).toBe("p-kryss");
    expect(result?.cells).toHaveLength(5);
  });

  it("detects a vertical 5-in-a-row", () => {
    const result = checkWinner(line(5, [3, -2], [0, 1], "p-ring"));
    expect(result?.winnerMark).toBe("ring");
  });

  it("detects a ↘ diagonal 5-in-a-row", () => {
    const result = checkWinner(line(5, [0, 0], [1, 1], "p-kryss"));
    expect(result?.winnerMark).toBe("kryss");
    expect(result?.cells.map((c) => [c.x, c.y])).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ]);
  });

  it("detects a ↗ diagonal 5-in-a-row", () => {
    const result = checkWinner(line(5, [0, 4], [1, -1], "p-ring"));
    expect(result?.winnerMark).toBe("ring");
  });

  it("still wins on an overline (6+ in a row)", () => {
    const result = checkWinner(line(7, [0, 0], [1, 0], "p-kryss"));
    expect(result?.cells).toHaveLength(7);
  });

  it("does not win on only 4 in a row", () => {
    expect(checkWinner(line(4, [0, 0], [1, 0], "p-kryss"))).toBeUndefined();
  });

  it("does not count an opponent's mark breaking the run", () => {
    const moves = [
      ...line(4, [0, 0], [1, 0], "p-kryss"),
      mark(4, 0, "p-ring"),
      mark(5, 0, "p-kryss"),
    ];
    expect(checkWinner(moves)).toBeUndefined();
  });

  it("only evaluates the line(s) through the last placed mark", () => {
    // An unrelated 5-in-a-row exists but wasn't just completed — the last
    // move here is a lone, unconnected mark elsewhere on the board.
    const moves = [...line(5, [0, 0], [1, 0], "p-kryss"), mark(50, 50, "p-ring")];
    expect(checkWinner(moves)).toBeUndefined();
  });
});
