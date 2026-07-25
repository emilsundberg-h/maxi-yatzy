import {
  ALL_CATEGORY_IDS,
  UPPER_BONUS_AMOUNT,
  UPPER_BONUS_THRESHOLD,
  UPPER_CATEGORY_IDS,
} from "./types";
import type { CategoryId } from "./types";

export type ScoreSheet = Partial<Record<CategoryId, number>>;

export function upperSum(scores: ScoreSheet): number {
  return UPPER_CATEGORY_IDS.reduce((sum, id) => sum + (scores[id] ?? 0), 0);
}

export function upperBonus(scores: ScoreSheet): number {
  return upperSum(scores) >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_AMOUNT : 0;
}

export function totalScore(scores: ScoreSheet): number {
  const sumAll = ALL_CATEGORY_IDS.reduce(
    (sum, id) => sum + (scores[id] ?? 0),
    0,
  );
  return sumAll + upperBonus(scores);
}

export function isScoreSheetComplete(scores: ScoreSheet): boolean {
  return ALL_CATEGORY_IDS.every((id) => scores[id] !== undefined);
}
