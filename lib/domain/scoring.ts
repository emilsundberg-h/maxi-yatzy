import {
  ALL_CATEGORY_IDS,
  UPPER_BONUS_AMOUNT,
  UPPER_BONUS_THRESHOLD,
  UPPER_CATEGORY_IDS,
} from "./types";
import type { CategoryId, MatchPlayer } from "./types";

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

// Highest score wins, same as a normally-finished match — except whoever
// forfeited (gave up rather than playing it out) is never eligible, even
// if their score happened to be highest at the time they quit.
export function matchWinnerId(
  matchPlayers: Pick<MatchPlayer, "playerId" | "scores">[],
  forfeitedByPlayerId?: string,
): string | undefined {
  const eligible = forfeitedByPlayerId
    ? matchPlayers.filter((mp) => mp.playerId !== forfeitedByPlayerId)
    : matchPlayers;
  const pool = eligible.length > 0 ? eligible : matchPlayers;
  return [...pool].sort((a, b) => totalScore(b.scores) - totalScore(a.scores))[0]
    ?.playerId;
}
