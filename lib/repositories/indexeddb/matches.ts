import type {
  Match,
  MatchMode,
  MatchPlayer,
  MatchStatus,
} from "@/lib/domain/types";
import type { MatchRepository } from "@/lib/repositories/types";
import { getDb } from "./db";

export class IndexedDbMatchRepository implements MatchRepository {
  async createMatch(mode: MatchMode, playerIds: string[]): Promise<Match> {
    const now = new Date().toISOString();
    const match: Match = {
      id: crypto.randomUUID(),
      mode,
      status: "in_progress",
      playerIds,
      // Random starting player; every turn after that rotates in playerIds
      // order (see useMatchStore's score() action).
      currentPlayerIndex: Math.floor(Math.random() * playerIds.length),
      currentTurnNumber: 1,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    const tx = db.transaction(["matches", "matchPlayers"], "readwrite");
    await tx.objectStore("matches").put(match);
    const matchPlayersStore = tx.objectStore("matchPlayers");
    await Promise.all(
      playerIds.map((playerId) =>
        matchPlayersStore.put({
          matchId: match.id,
          playerId,
          scores: {},
          pool: 0,
        } satisfies MatchPlayer),
      ),
    );
    await tx.done;

    return match;
  }

  async getMatch(id: string): Promise<Match | undefined> {
    const db = await getDb();
    return db.get("matches", id);
  }

  async listMatches(filter?: { status?: MatchStatus }): Promise<Match[]> {
    const db = await getDb();
    if (!filter?.status) return db.getAll("matches");
    return db.getAllFromIndex("matches", "by-status", filter.status);
  }

  async updateMatch(match: Match): Promise<void> {
    const db = await getDb();
    await db.put("matches", { ...match, updatedAt: new Date().toISOString() });
  }

  async deleteMatch(id: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(["matches", "matchPlayers", "activity"], "readwrite");
    await tx.objectStore("matches").delete(id);
    const matchPlayersStore = tx.objectStore("matchPlayers");
    const playerKeys = await matchPlayersStore.index("by-matchId").getAllKeys(id);
    await Promise.all(playerKeys.map((key) => matchPlayersStore.delete(key)));
    const activityStore = tx.objectStore("activity");
    const activityKeys = await activityStore.index("by-matchId").getAllKeys(id);
    await Promise.all(activityKeys.map((key) => activityStore.delete(key)));
    await tx.done;
  }

  async getMatchPlayer(
    matchId: string,
    playerId: string,
  ): Promise<MatchPlayer | undefined> {
    const db = await getDb();
    return db.get("matchPlayers", [matchId, playerId]);
  }

  async listMatchPlayers(matchId: string): Promise<MatchPlayer[]> {
    const db = await getDb();
    return db.getAllFromIndex("matchPlayers", "by-matchId", matchId);
  }

  async updateMatchPlayer(matchPlayer: MatchPlayer): Promise<void> {
    const db = await getDb();
    await db.put("matchPlayers", matchPlayer);
  }

  async inviteByEmail(): Promise<void> {
    // No-op: local storage has no concept of other users to invite.
  }
}
