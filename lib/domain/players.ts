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
