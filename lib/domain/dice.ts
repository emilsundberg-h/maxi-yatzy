import type { Dice, DieValue, Locked } from "./types";
import { rollDie } from "./rng";

export function initialDice(): Dice {
  return [1, 1, 1, 1, 1, 1];
}

export function initialLocked(): Locked {
  return [false, false, false, false, false, false];
}

export function rerollUnlocked(
  dice: Dice,
  locked: Locked,
  rng: () => DieValue = rollDie,
): Dice {
  return dice.map((value, i) => (locked[i] ? value : rng())) as Dice;
}

export function toggleLock(locked: Locked, index: number): Locked {
  const next = [...locked] as Locked;
  next[index] = !next[index];
  return next;
}

export function countByValue(dice: Dice): Record<DieValue, number> {
  const counts: Record<DieValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const value of dice) counts[value] += 1;
  return counts;
}
