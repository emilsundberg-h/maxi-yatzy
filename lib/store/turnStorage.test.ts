import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TurnState } from "@/lib/domain/turn";
import { clearTurnStorage, loadTurnFromStorage, saveTurnToStorage } from "./turnStorage";

// The vitest environment is plain node (no jsdom), so `window` doesn't exist
// unless we fake it — same as it wouldn't exist during SSR. A minimal
// in-memory localStorage stand-in is enough to exercise the real code path.
function makeFakeLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  } as Storage;
}

const turn: TurnState = {
  dice: [1, 2, 3, 4, 5, 6],
  locked: [false, true, false, false, false, false],
  rollsUsedThisTurn: 2,
  rollsBorrowedThisTurn: 0,
};

describe("turnStorage", () => {
  beforeEach(() => {
    (globalThis as { window?: unknown }).window = { localStorage: makeFakeLocalStorage() };
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("round-trips a saved turn for the exact same match/player/turn", () => {
    saveTurnToStorage("m1", 0, 1, turn, 1);
    expect(loadTurnFromStorage("m1", 0, 1)).toEqual({ turn, poolDeltaSoFar: 1 });
  });

  it("refuses to return a turn for a different player index (turn moved on)", () => {
    saveTurnToStorage("m1", 0, 1, turn, 0);
    expect(loadTurnFromStorage("m1", 1, 1)).toBeUndefined();
  });

  it("refuses to return a turn for a different turn number", () => {
    saveTurnToStorage("m1", 0, 1, turn, 0);
    expect(loadTurnFromStorage("m1", 0, 2)).toBeUndefined();
  });

  it("refuses to return a turn that hasn't been rolled yet", () => {
    saveTurnToStorage("m1", 0, 1, { ...turn, rollsUsedThisTurn: 0 }, 0);
    expect(loadTurnFromStorage("m1", 0, 1)).toBeUndefined();
  });

  it("returns nothing once cleared", () => {
    saveTurnToStorage("m1", 0, 1, turn, 0);
    clearTurnStorage("m1");
    expect(loadTurnFromStorage("m1", 0, 1)).toBeUndefined();
  });

  it("keeps separate matches isolated from each other", () => {
    saveTurnToStorage("m1", 0, 1, turn, 0);
    saveTurnToStorage("m2", 0, 1, { ...turn, dice: [6, 6, 6, 6, 6, 6] }, 0);
    expect(loadTurnFromStorage("m1", 0, 1)?.turn.dice).toEqual([1, 2, 3, 4, 5, 6]);
    expect(loadTurnFromStorage("m2", 0, 1)?.turn.dice).toEqual([6, 6, 6, 6, 6, 6]);
  });
});
