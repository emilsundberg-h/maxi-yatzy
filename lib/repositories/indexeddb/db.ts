import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ActivityEvent, Match, MatchPlayer, Player } from "@/lib/domain/types";

export const DB_NAME = "maxi-yatzy";
const DB_VERSION = 1;

export interface MaxiYatzyDB extends DBSchema {
  players: {
    key: string;
    value: Player;
  };
  matches: {
    key: string;
    value: Match;
    indexes: { "by-status": string; "by-updatedAt": string };
  };
  matchPlayers: {
    key: [string, string]; // [matchId, playerId]
    value: MatchPlayer;
    indexes: { "by-matchId": string; "by-playerId": string };
  };
  activity: {
    // Out-of-line autoIncrement key, decoupled from the domain `id` (uuid)
    // field. IndexedDB orders same-value index hits by primary key, so this
    // guarantees insertion order even when two events share a millisecond
    // timestamp — sorting by the `createdAt` string alone can't do that.
    key: number;
    value: ActivityEvent;
    indexes: { "by-matchId": string };
  };
  settings: {
    key: string;
    value: { key: string; value: string };
  };
}

let dbPromise: Promise<IDBPDatabase<MaxiYatzyDB>> | undefined;

export function getDb(): Promise<IDBPDatabase<MaxiYatzyDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MaxiYatzyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("players", { keyPath: "id" });

        const matches = db.createObjectStore("matches", { keyPath: "id" });
        matches.createIndex("by-status", "status");
        matches.createIndex("by-updatedAt", "updatedAt");

        const matchPlayers = db.createObjectStore("matchPlayers", {
          keyPath: ["matchId", "playerId"],
        });
        matchPlayers.createIndex("by-matchId", "matchId");
        matchPlayers.createIndex("by-playerId", "playerId");

        const activity = db.createObjectStore("activity", { autoIncrement: true });
        activity.createIndex("by-matchId", "matchId");

        db.createObjectStore("settings", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}

/** Test-only: closes the current connection and forces a fresh one on next getDb() call. */
export async function resetDbConnectionForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
  }
  dbPromise = undefined;
}
