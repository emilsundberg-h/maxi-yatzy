export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export type Dice = [DieValue, DieValue, DieValue, DieValue, DieValue, DieValue];
export type Locked = [boolean, boolean, boolean, boolean, boolean, boolean];

export type CategoryId =
  | "ones"
  | "twos"
  | "threes"
  | "fours"
  | "fives"
  | "sixes"
  | "onePair"
  | "twoPairs"
  | "threePairs"
  | "threeOfAKind"
  | "fourOfAKind"
  | "fiveOfAKind"
  | "smallStraight"
  | "largeStraight"
  | "fullStraight"
  | "kak"
  | "villa"
  | "torn"
  | "chance"
  | "maxiYatzy";

export const UPPER_CATEGORY_IDS: readonly CategoryId[] = [
  "ones",
  "twos",
  "threes",
  "fours",
  "fives",
  "sixes",
];

export const LOWER_CATEGORY_IDS: readonly CategoryId[] = [
  "onePair",
  "twoPairs",
  "threePairs",
  "threeOfAKind",
  "fourOfAKind",
  "fiveOfAKind",
  "smallStraight",
  "largeStraight",
  "fullStraight",
  "kak",
  "villa",
  "torn",
  "chance",
  "maxiYatzy",
];

export const ALL_CATEGORY_IDS: readonly CategoryId[] = [
  ...UPPER_CATEGORY_IDS,
  ...LOWER_CATEGORY_IDS,
];

export const UPPER_BONUS_THRESHOLD = 84;
export const UPPER_BONUS_AMOUNT = 100;

export interface Player {
  id: string;
  name: string;
  createdAt: string;
  linkedUserId: string | null;
  avatarUrl: string | null;
}

export type MatchMode = "shared-device" | "separate-devices";
export type MatchStatus = "in_progress" | "completed";

export interface Match {
  id: string;
  mode: MatchMode;
  status: MatchStatus;
  playerIds: string[];
  currentPlayerIndex: number;
  currentTurnNumber: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  // Dice as they stood when the last turn (anyone's) ended — shown at the
  // start of the next turn instead of a fresh [1,1,1,1,1,1]. One shared
  // set of dice on the table, same as a physical game: whoever's turn it
  // is picks up however the previous player left them, not their own
  // dice from turns ago. Undefined until the match's first turn ends.
  lastDice?: Dice;
  // Set when someone swipes the match away to give up rather than playing
  // it out — that player forfeits and can never be the winner shown for
  // this match, even if their score was highest at the time.
  forfeitedByPlayerId?: string;
}

export interface MatchPlayer {
  matchId: string;
  playerId: string;
  scores: Partial<Record<CategoryId, number>>;
  pool: number;
}

export type ActivityEventType =
  | "roll"
  | "roll_borrowed"
  | "lock_toggle"
  | "category_scored"
  | "roll_banked"
  | "turn_started";

export interface ActivityEvent {
  id: string;
  matchId: string;
  playerId: string;
  turnNumber: number;
  type: ActivityEventType;
  payload: unknown;
  createdAt: string;
}
