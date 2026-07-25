import { initialDice, initialLocked, rerollUnlocked, toggleLock } from "./dice";
import { rollDie } from "./rng";
import type { Dice, DieValue, Locked } from "./types";

export interface TurnState {
  dice: Dice;
  locked: Locked;
  rollsUsedThisTurn: number;
  rollsBorrowedThisTurn: number;
}

export const FREE_ROLLS_PER_TURN = 3;

export function startTurn(): TurnState {
  return {
    dice: initialDice(),
    locked: initialLocked(),
    rollsUsedThisTurn: 0,
    rollsBorrowedThisTurn: 0,
  };
}

export function canRoll(state: TurnState, pool: number): boolean {
  return state.rollsUsedThisTurn < FREE_ROLLS_PER_TURN || pool > 0;
}

export function rollTurn(
  state: TurnState,
  pool: number,
  rng: () => DieValue = rollDie,
): { state: TurnState; poolDelta: number } {
  const usingBorrow = state.rollsUsedThisTurn >= FREE_ROLLS_PER_TURN;
  if (usingBorrow && pool <= 0) {
    throw new Error("No banked rolls left to borrow");
  }
  const dice = rerollUnlocked(state.dice, state.locked, rng);
  return {
    state: {
      ...state,
      dice,
      rollsUsedThisTurn: state.rollsUsedThisTurn + 1,
      rollsBorrowedThisTurn:
        state.rollsBorrowedThisTurn + (usingBorrow ? 1 : 0),
    },
    poolDelta: usingBorrow ? -1 : 0,
  };
}

export function toggleDieLock(state: TurnState, index: number): TurnState {
  if (state.rollsUsedThisTurn === 0) {
    throw new Error("Cannot lock a die before the first roll of the turn");
  }
  return { ...state, locked: toggleLock(state.locked, index) };
}

export function scoreAndEndTurn(state: TurnState): { bankedGain: number } {
  if (state.rollsUsedThisTurn === 0) {
    throw new Error("Must roll at least once before scoring");
  }
  const bankedGain = Math.max(
    0,
    FREE_ROLLS_PER_TURN - state.rollsUsedThisTurn,
  );
  return { bankedGain };
}
