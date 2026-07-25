import type { DieValue } from "./types";

export function rollDie(): DieValue {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return ((array[0] % 6) + 1) as DieValue;
}
