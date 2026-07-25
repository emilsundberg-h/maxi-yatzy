import { describe, expect, it } from "vitest";
import { isScoreSheetComplete, totalScore, upperBonus, upperSum } from "./scoring";
import { ALL_CATEGORY_IDS } from "./types";
import type { ScoreSheet } from "./scoring";

describe("upper bonus", () => {
  it("is 0 below the 84 threshold", () => {
    const scores: ScoreSheet = {
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18,
    }; // sum 63
    expect(upperSum(scores)).toBe(63);
    expect(upperBonus(scores)).toBe(0);
  });

  it("is 100 at or above the 84 threshold", () => {
    const scores: ScoreSheet = {
      ones: 4,
      twos: 8,
      threes: 12,
      fours: 16,
      fives: 20,
      sixes: 24,
    }; // sum 84
    expect(upperSum(scores)).toBe(84);
    expect(upperBonus(scores)).toBe(100);
  });
});

describe("total score", () => {
  it("sums all filled categories plus the bonus", () => {
    const scores: ScoreSheet = {
      ones: 4,
      twos: 8,
      threes: 12,
      fours: 16,
      fives: 20,
      sixes: 24,
      chance: 21,
    };
    expect(totalScore(scores)).toBe(4 + 8 + 12 + 16 + 20 + 24 + 21 + 100);
  });

  it("treats unfilled categories as 0", () => {
    expect(totalScore({})).toBe(0);
  });
});

describe("isScoreSheetComplete", () => {
  it("is false until all 20 categories are filled", () => {
    expect(isScoreSheetComplete({})).toBe(false);
    const full: ScoreSheet = {};
    for (const id of ALL_CATEGORY_IDS) full[id] = 0;
    expect(isScoreSheetComplete(full)).toBe(true);
  });
});
