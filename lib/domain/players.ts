import type { Player } from "./types";

// In separate-devices mode, a match's player rows almost always live in the
// match *owner's* roster (owner_user_id = the owner), not necessarily the
// current viewer's own — an invited participant's row only points back to
// them via linkedUserId, set once they accept the invite. Comparing row ids
// against "my own roster's self entry" only ever works for the owner; this
// is the one comparison that works for every participant on every device.
export function playerBelongsToUser(
  player: Pick<Player, "linkedUserId"> | undefined,
  userId: string | undefined,
): boolean {
  return !!userId && player?.linkedUserId === userId;
}

// The same real person can be represented by more than one player row (their
// own row when they own the match, a guest row someone else made for them
// when that other person owns it instead) — so aggregating stats across
// matches by raw row id fragments one person into several leaderboard
// entries. Falls back to the row id itself for a never-linked guest player,
// where there's no better shared identity to group by.
export function canonicalPlayerId(
  playerId: string,
  playersById: Record<string, Pick<Player, "linkedUserId"> | undefined>,
): string {
  return playersById[playerId]?.linkedUserId ?? playerId;
}
