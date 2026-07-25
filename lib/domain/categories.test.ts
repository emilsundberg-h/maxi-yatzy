import { describe, expect, it } from "vitest";
import { CATEGORY_LABELS, scoreCategory } from "./categories";
import { ALL_CATEGORY_IDS } from "./types";
import type { Dice } from "./types";

describe("CATEGORY_LABELS", () => {
  it("has a non-empty label for every category", () => {
    for (const id of ALL_CATEGORY_IDS) {
      expect(CATEGORY_LABELS[id]).toBeTruthy();
    }
  });
});

describe("upper section", () => {
  it("sums matching dice for a face", () => {
    const dice: Dice = [1, 1, 3, 4, 5, 6];
    expect(scoreCategory("ones", dice)).toBe(2);
    expect(scoreCategory("sixes", dice)).toBe(6);
  });
});

describe("pairs", () => {
  it("onePair scores the highest pair", () => {
    const dice: Dice = [1, 1, 2, 2, 3, 4];
    expect(scoreCategory("onePair", dice)).toBe(4);
  });

  it("twoPairs scores the two highest pairs", () => {
    const dice: Dice = [1, 1, 2, 2, 3, 4];
    expect(scoreCategory("twoPairs", dice)).toBe(6);
  });

  it("twoPairs is 0 when only one pair exists", () => {
    const dice: Dice = [1, 1, 2, 3, 4, 5];
    expect(scoreCategory("twoPairs", dice)).toBe(0);
  });

  it("threePairs scores all three pairs using all six dice", () => {
    const dice: Dice = [1, 1, 2, 2, 3, 3];
    expect(scoreCategory("threePairs", dice)).toBe(12);
  });

  it("threePairs is 0 when there are only two pairs", () => {
    const dice: Dice = [1, 1, 2, 2, 3, 4];
    expect(scoreCategory("threePairs", dice)).toBe(0);
  });

  it("four-of-a-kind does not count as two pairs of the same value", () => {
    const dice: Dice = [5, 5, 5, 5, 1, 2];
    expect(scoreCategory("twoPairs", dice)).toBe(0);
  });
});

describe("of-a-kind categories", () => {
  it("threeOfAKind scores the highest triple", () => {
    const dice: Dice = [5, 5, 5, 1, 2, 3];
    expect(scoreCategory("threeOfAKind", dice)).toBe(15);
  });

  it("fourOfAKind scores the highest quad", () => {
    const dice: Dice = [5, 5, 5, 5, 1, 2];
    expect(scoreCategory("fourOfAKind", dice)).toBe(20);
  });

  it("fiveOfAKind scores the highest quint", () => {
    const dice: Dice = [5, 5, 5, 5, 5, 1];
    expect(scoreCategory("fiveOfAKind", dice)).toBe(25);
  });
});

describe("straights", () => {
  it("smallStraight requires 1-5 present", () => {
    expect(scoreCategory("smallStraight", [1, 2, 3, 4, 5, 5])).toBe(15);
    expect(scoreCategory("smallStraight", [1, 2, 3, 4, 6, 6])).toBe(0);
  });

  it("largeStraight requires 2-6 present", () => {
    expect(scoreCategory("largeStraight", [2, 3, 4, 5, 6, 6])).toBe(20);
    expect(scoreCategory("largeStraight", [1, 2, 3, 4, 5, 6])).toBe(20);
  });

  it("fullStraight requires exactly one of each face", () => {
    expect(scoreCategory("fullStraight", [1, 2, 3, 4, 5, 6])).toBe(21);
    expect(scoreCategory("fullStraight", [1, 2, 3, 4, 5, 5])).toBe(0);
  });
});

describe("house-shaped categories", () => {
  it("kak (pair+triple) picks the best distinct pair for a given triple", () => {
    const dice: Dice = [3, 3, 3, 5, 5, 1];
    expect(scoreCategory("kak", dice)).toBe(3 * 3 + 2 * 5);
  });

  it("kak is 0 when no distinct pair is available", () => {
    const dice: Dice = [3, 3, 3, 3, 3, 3];
    expect(scoreCategory("kak", dice)).toBe(0);
  });

  it("villa (3+3) scores two distinct triples", () => {
    const dice: Dice = [4, 4, 4, 2, 2, 2];
    expect(scoreCategory("villa", dice)).toBe(3 * (4 + 2));
  });

  it("villa is 0 with only one triple", () => {
    const dice: Dice = [4, 4, 4, 2, 2, 1];
    expect(scoreCategory("villa", dice)).toBe(0);
  });

  it("torn (pair+quad) picks the best distinct pair for the quad", () => {
    const dice: Dice = [6, 6, 6, 6, 3, 3];
    expect(scoreCategory("torn", dice)).toBe(4 * 6 + 2 * 3);
  });
});

describe("chance and maxi yatzy", () => {
  it("chance sums all dice", () => {
    const dice: Dice = [1, 2, 3, 4, 5, 6];
    expect(scoreCategory("chance", dice)).toBe(21);
  });

  it("maxiYatzy scores 100 for six of a kind", () => {
    expect(scoreCategory("maxiYatzy", [6, 6, 6, 6, 6, 6])).toBe(100);
    expect(scoreCategory("maxiYatzy", [6, 6, 6, 6, 6, 5])).toBe(0);
  });
});
