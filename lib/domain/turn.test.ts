import { describe, expect, it } from "vitest";
import {
  canRoll,
  FREE_ROLLS_PER_TURN,
  rollTurn,
  scoreAndEndTurn,
  startTurn,
  toggleDieLock,
} from "./turn";
import type { DieValue } from "./types";

const fixedRng = (value: DieValue) => () => value;

describe("turn lifecycle", () => {
  it("starts with zero rolls used and all dice unlocked", () => {
    const state = startTurn();
    expect(state.rollsUsedThisTurn).toBe(0);
    expect(state.rollsBorrowedThisTurn).toBe(0);
    expect(state.locked).toEqual([false, false, false, false, false, false]);
  });

  it("allows rolling even with an empty pool for the first 3 rolls", () => {
    expect(canRoll(startTurn(), 0)).toBe(true);
  });

  it("blocks rolling past 3 with an empty pool, allows it with a nonempty pool", () => {
    let state = startTurn();
    for (let i = 0; i < FREE_ROLLS_PER_TURN; i++) {
      state = rollTurn(state, 0, fixedRng(4)).state;
    }
    expect(canRoll(state, 0)).toBe(false);
    expect(canRoll(state, 1)).toBe(true);
  });

  it("throws when locking a die before the first roll", () => {
    expect(() => toggleDieLock(startTurn(), 0)).toThrow();
  });

  it("throws when scoring before rolling", () => {
    expect(() => scoreAndEndTurn(startTurn())).toThrow();
  });
});

describe("saved-rolls pool — the user's example: 4 ones on roll 1, lock in early", () => {
  it("banks the 2 unused rolls", () => {
    let state = startTurn();
    const result = rollTurn(state, 0, fixedRng(1));
    state = result.state;
    expect(result.poolDelta).toBe(0);
    expect(state.rollsUsedThisTurn).toBe(1);

    const { bankedGain } = scoreAndEndTurn(state);
    expect(bankedGain).toBe(2);
  });
});

describe("saved-rolls pool — using all 3 free rolls", () => {
  it("banks nothing", () => {
    let state = startTurn();
    for (let i = 0; i < 3; i++) {
      state = rollTurn(state, 0, fixedRng(3)).state;
    }
    const { bankedGain } = scoreAndEndTurn(state);
    expect(bankedGain).toBe(0);
  });
});

describe("saved-rolls pool — borrowing", () => {
  it("debits the pool live, one token per roll, and rejects borrowing with an empty pool", () => {
    let state = startTurn();
    let pool = 2;
    for (let i = 0; i < 3; i++) {
      const result = rollTurn(state, pool, fixedRng(2));
      state = result.state;
      pool += result.poolDelta;
    }
    expect(pool).toBe(2); // free rolls don't touch the pool

    const borrow1 = rollTurn(state, pool, fixedRng(2));
    state = borrow1.state;
    pool += borrow1.poolDelta;
    expect(pool).toBe(1);
    expect(state.rollsBorrowedThisTurn).toBe(1);

    const borrow2 = rollTurn(state, pool, fixedRng(2));
    state = borrow2.state;
    pool += borrow2.poolDelta;
    expect(pool).toBe(0);

    expect(() => rollTurn(state, pool, fixedRng(2))).toThrow();
  });

  it("mutual exclusion: a turn that borrows never also banks (no double-accounting)", () => {
    let state = startTurn();
    let pool = 5;
    for (let i = 0; i < 3; i++) {
      const r = rollTurn(state, pool, fixedRng(6));
      state = r.state;
      pool += r.poolDelta;
    }
    const borrowed = rollTurn(state, pool, fixedRng(6));
    state = borrowed.state;
    pool += borrowed.poolDelta;

    expect(state.rollsBorrowedThisTurn).toBeGreaterThan(0);
    const { bankedGain } = scoreAndEndTurn(state);
    expect(bankedGain).toBe(0);
  });

  it("mutual exclusion the other way: a turn that banks never borrowed", () => {
    let state = startTurn();
    state = rollTurn(state, 3, fixedRng(5)).state;
    expect(state.rollsBorrowedThisTurn).toBe(0);
    const { bankedGain } = scoreAndEndTurn(state);
    expect(bankedGain).toBeGreaterThan(0);
  });
});

describe("pool never goes negative across a simulated multi-turn match", () => {
  it("holds the invariant across a scripted sequence of turns", () => {
    let pool = 0;
    const turnScripts: number[] = [1, 3, 2, 1, 3, 1]; // rolls used per turn
    for (const rollsThisTurn of turnScripts) {
      let state = startTurn();
      for (let i = 0; i < rollsThisTurn; i++) {
        const result = rollTurn(state, pool, fixedRng(4));
        state = result.state;
        pool += result.poolDelta;
        expect(pool).toBeGreaterThanOrEqual(0);
      }
      const { bankedGain } = scoreAndEndTurn(state);
      pool += bankedGain;
      expect(pool).toBeGreaterThanOrEqual(0);
    }
  });
});
