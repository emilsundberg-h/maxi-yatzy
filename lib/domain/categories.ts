import { countByValue } from "./dice";
import type { CategoryId, Dice, DieValue } from "./types";

const VALUES: DieValue[] = [1, 2, 3, 4, 5, 6];

function valuesWithCountAtLeast(
  counts: Record<DieValue, number>,
  minCount: number,
  exclude?: DieValue,
): DieValue[] {
  return VALUES.filter((v) => v !== exclude && counts[v] >= minCount).sort(
    (a, b) => b - a,
  );
}

function bestPairPlusGroup(
  counts: Record<DieValue, number>,
  groupMinCount: number,
  groupMultiplier: number,
): number {
  const groupCandidates = valuesWithCountAtLeast(counts, groupMinCount);
  let best = 0;
  for (const group of groupCandidates) {
    const pairCandidates = valuesWithCountAtLeast(counts, 2, group);
    if (pairCandidates.length === 0) continue;
    const pair = pairCandidates[0];
    best = Math.max(best, groupMultiplier * group + 2 * pair);
  }
  return best;
}

function distinctSet(dice: Dice): Set<DieValue> {
  return new Set(dice);
}

function containsAll(set: Set<DieValue>, values: DieValue[]): boolean {
  return values.every((v) => set.has(v));
}

const CATEGORY_SCORERS: Record<CategoryId, (dice: Dice) => number> = {
  ones: (dice) => countByValue(dice)[1] * 1,
  twos: (dice) => countByValue(dice)[2] * 2,
  threes: (dice) => countByValue(dice)[3] * 3,
  fours: (dice) => countByValue(dice)[4] * 4,
  fives: (dice) => countByValue(dice)[5] * 5,
  sixes: (dice) => countByValue(dice)[6] * 6,

  onePair: (dice) => {
    const candidates = valuesWithCountAtLeast(countByValue(dice), 2);
    return candidates.length > 0 ? 2 * candidates[0] : 0;
  },
  twoPairs: (dice) => {
    const candidates = valuesWithCountAtLeast(countByValue(dice), 2);
    if (candidates.length < 2) return 0;
    return 2 * (candidates[0] + candidates[1]);
  },
  threePairs: (dice) => {
    const candidates = valuesWithCountAtLeast(countByValue(dice), 2);
    if (candidates.length < 3) return 0;
    return 2 * (candidates[0] + candidates[1] + candidates[2]);
  },

  threeOfAKind: (dice) => {
    const candidates = valuesWithCountAtLeast(countByValue(dice), 3);
    return candidates.length > 0 ? 3 * candidates[0] : 0;
  },
  fourOfAKind: (dice) => {
    const candidates = valuesWithCountAtLeast(countByValue(dice), 4);
    return candidates.length > 0 ? 4 * candidates[0] : 0;
  },
  fiveOfAKind: (dice) => {
    const candidates = valuesWithCountAtLeast(countByValue(dice), 5);
    return candidates.length > 0 ? 5 * candidates[0] : 0;
  },

  smallStraight: (dice) =>
    containsAll(distinctSet(dice), [1, 2, 3, 4, 5]) ? 15 : 0,
  largeStraight: (dice) =>
    containsAll(distinctSet(dice), [2, 3, 4, 5, 6]) ? 20 : 0,
  fullStraight: (dice) =>
    containsAll(distinctSet(dice), [1, 2, 3, 4, 5, 6]) ? 21 : 0,

  kak: (dice) => bestPairPlusGroup(countByValue(dice), 3, 3),
  villa: (dice) => {
    const candidates = valuesWithCountAtLeast(countByValue(dice), 3);
    if (candidates.length < 2) return 0;
    return 3 * (candidates[0] + candidates[1]);
  },
  torn: (dice) => bestPairPlusGroup(countByValue(dice), 4, 4),

  chance: (dice) => dice.reduce((sum, v) => sum + v, 0),

  maxiYatzy: (dice) => {
    const candidates = valuesWithCountAtLeast(countByValue(dice), 6);
    return candidates.length > 0 ? 100 : 0;
  },
};

export function scoreCategory(category: CategoryId, dice: Dice): number {
  return CATEGORY_SCORERS[category](dice);
}

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  ones: "Ettor",
  twos: "Tvåor",
  threes: "Treor",
  fours: "Fyror",
  fives: "Femmor",
  sixes: "Sexor",
  onePair: "Par",
  twoPairs: "Två par",
  threePairs: "Tre par",
  threeOfAKind: "Triss",
  fourOfAKind: "Fyrtal",
  fiveOfAKind: "Femtal",
  smallStraight: "Liten stege",
  largeStraight: "Stor stege",
  fullStraight: "Full stege",
  kak: "Kåk (3+2)",
  villa: "Villa (3+3)",
  torn: "Torn (4+2)",
  chance: "Chans",
  maxiYatzy: "Maxi Yatzy",
};
