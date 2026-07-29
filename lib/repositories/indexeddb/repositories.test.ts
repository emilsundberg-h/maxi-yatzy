import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { DB_NAME, resetDbConnectionForTests } from "./db";
import { IndexedDbActivityRepository } from "./activity";
import { IndexedDbMatchRepository } from "./matches";
import { IndexedDbPlayerRepository } from "./players";
import { IndexedDbSettingsRepository } from "./settings";

beforeEach(async () => {
  await resetDbConnectionForTests();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
});

describe("IndexedDbPlayerRepository", () => {
  it("creates, gets, and lists players", async () => {
    const repo = new IndexedDbPlayerRepository();
    const player = await repo.createPlayer("Anna");
    expect(player.name).toBe("Anna");

    expect(await repo.getPlayer(player.id)).toEqual(player);
    expect(await repo.listPlayers()).toEqual([player]);
  });
});

describe("IndexedDbMatchRepository", () => {
  it("creates a match with a MatchPlayer row per player", async () => {
    const players = new IndexedDbPlayerRepository();
    const matches = new IndexedDbMatchRepository();

    const anna = await players.createPlayer("Anna");
    const bo = await players.createPlayer("Bo");

    const match = await matches.createMatch("shared-device", [anna.id, bo.id]);
    expect(match.status).toBe("in_progress");
    expect(match.currentTurnNumber).toBe(1);

    const matchPlayers = await matches.listMatchPlayers(match.id);
    expect(matchPlayers).toHaveLength(2);
    expect(matchPlayers.map((mp) => mp.playerId).sort()).toEqual(
      [anna.id, bo.id].sort(),
    );
    for (const mp of matchPlayers) {
      expect(mp.pool).toBe(0);
      expect(mp.scores).toEqual({});
    }
  });

  it("round-trips match and matchPlayer updates", async () => {
    const players = new IndexedDbPlayerRepository();
    const matches = new IndexedDbMatchRepository();
    const anna = await players.createPlayer("Anna");
    const match = await matches.createMatch("separate-devices", [anna.id]);

    await matches.updateMatch({ ...match, currentTurnNumber: 2 });
    const reloaded = await matches.getMatch(match.id);
    expect(reloaded?.currentTurnNumber).toBe(2);

    const mp = await matches.getMatchPlayer(match.id, anna.id);
    expect(mp).toBeDefined();
    await matches.updateMatchPlayer({ ...mp!, pool: 3, scores: { chance: 21 } });
    const reloadedMp = await matches.getMatchPlayer(match.id, anna.id);
    expect(reloadedMp?.pool).toBe(3);
    expect(reloadedMp?.scores).toEqual({ chance: 21 });
  });

  it("filters matches by status", async () => {
    const players = new IndexedDbPlayerRepository();
    const matches = new IndexedDbMatchRepository();
    const anna = await players.createPlayer("Anna");
    const m1 = await matches.createMatch("shared-device", [anna.id]);
    await matches.createMatch("shared-device", [anna.id]);
    await matches.updateMatch({ ...m1, status: "completed" });

    expect(await matches.listMatches({ status: "in_progress" })).toHaveLength(1);
    expect(await matches.listMatches({ status: "completed" })).toHaveLength(1);
    expect(await matches.listMatches()).toHaveLength(2);
  });

  it("deleteMatch removes the match, its players, and its activity — and nothing from an unrelated match", async () => {
    const players = new IndexedDbPlayerRepository();
    const matches = new IndexedDbMatchRepository();
    const activity = new IndexedDbActivityRepository();
    const anna = await players.createPlayer("Anna");
    const bo = await players.createPlayer("Bo");

    const target = await matches.createMatch("shared-device", [anna.id, bo.id]);
    await activity.append({
      matchId: target.id,
      playerId: anna.id,
      turnNumber: 1,
      type: "turn_started",
      payload: null,
    });
    const other = await matches.createMatch("shared-device", [anna.id]);
    await activity.append({
      matchId: other.id,
      playerId: anna.id,
      turnNumber: 1,
      type: "turn_started",
      payload: null,
    });

    await matches.deleteMatch(target.id);

    expect(await matches.getMatch(target.id)).toBeUndefined();
    expect(await matches.listMatchPlayers(target.id)).toEqual([]);
    expect(await activity.listByMatch(target.id)).toEqual([]);

    // The unrelated match is untouched.
    expect(await matches.getMatch(other.id)).toBeDefined();
    expect(await matches.listMatchPlayers(other.id)).toHaveLength(1);
    expect(await activity.listByMatch(other.id)).toHaveLength(1);
  });
});

describe("IndexedDbActivityRepository", () => {
  it("appends events and lists them in chronological order per match", async () => {
    const players = new IndexedDbPlayerRepository();
    const matches = new IndexedDbMatchRepository();
    const activity = new IndexedDbActivityRepository();
    const anna = await players.createPlayer("Anna");
    const match = await matches.createMatch("shared-device", [anna.id]);

    await activity.append({
      matchId: match.id,
      playerId: anna.id,
      turnNumber: 1,
      type: "turn_started",
      payload: null,
    });
    await activity.append({
      matchId: match.id,
      playerId: anna.id,
      turnNumber: 1,
      type: "roll",
      payload: { dice: [1, 2, 3, 4, 5, 6] },
    });

    const events = await activity.listByMatch(match.id);
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("turn_started");
    expect(events[1].type).toBe("roll");
  });
});

describe("IndexedDbSettingsRepository", () => {
  it("stores and retrieves the local player id", async () => {
    const settings = new IndexedDbSettingsRepository();
    expect(await settings.getLocalPlayerId()).toBeUndefined();
    await settings.setLocalPlayerId("player-123");
    expect(await settings.getLocalPlayerId()).toBe("player-123");
  });
});
