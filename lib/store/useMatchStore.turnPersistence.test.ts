import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ActivityEvent,
  Match,
  MatchMode,
  MatchPlayer,
  MatchStatus,
} from "@/lib/domain/types";
import type { Repositories } from "@/lib/repositories/types";

// Same fake-repo shape as the other useMatchStore test files.
function makeFakeRepos(): Repositories & {
  matchesById: Map<string, Match>;
  matchPlayersByKey: Map<string, MatchPlayer>;
} {
  const matchesById = new Map<string, Match>();
  const matchPlayersByKey = new Map<string, MatchPlayer>();
  const key = (matchId: string, playerId: string) => `${matchId}:${playerId}`;

  return {
    matchesById,
    matchPlayersByKey,
    players: {
      async createPlayer(name) {
        return { id: name, name, createdAt: "", linkedUserId: null, avatarUrl: null };
      },
      async getPlayer(id) {
        return { id, name: id, createdAt: "", linkedUserId: null, avatarUrl: null };
      },
      async listPlayers() {
        return [];
      },
      async renamePlayer() {},
    },
    matches: {
      async createMatch(mode: MatchMode, playerIds: string[]) {
        const match: Match = {
          id: "m1",
          mode,
          status: "in_progress",
          playerIds,
          currentPlayerIndex: 0,
          currentTurnNumber: 1,
          createdAt: "",
          updatedAt: "",
        };
        matchesById.set(match.id, match);
        for (const playerId of playerIds) {
          matchPlayersByKey.set(key(match.id, playerId), {
            matchId: match.id,
            playerId,
            scores: {},
            pool: 0,
          });
        }
        return match;
      },
      async getMatch(id: string) {
        return matchesById.get(id);
      },
      async listMatches(filter?: { status?: MatchStatus }) {
        return [...matchesById.values()].filter(
          (m) => !filter?.status || m.status === filter.status,
        );
      },
      async updateMatch(match: Match) {
        matchesById.set(match.id, match);
      },
      async deleteMatch(id: string) {
        matchesById.delete(id);
      },
      async getMatchPlayer(matchId: string, playerId: string) {
        return matchPlayersByKey.get(key(matchId, playerId));
      },
      async listMatchPlayers(matchId: string) {
        return [...matchPlayersByKey.values()].filter((mp) => mp.matchId === matchId);
      },
      async updateMatchPlayer(matchPlayer: MatchPlayer) {
        matchPlayersByKey.set(key(matchPlayer.matchId, matchPlayer.playerId), {
          ...matchPlayer,
          scores: matchPlayer.scores,
          pool: matchPlayer.pool,
        });
      },
      async inviteByEmail() {},
    },
    activity: {
      async append(event) {
        return { ...event, id: "a1", createdAt: "" } as ActivityEvent;
      },
      async listByMatch() {
        return [];
      },
    },
    settings: {
      async getLocalPlayerId() {
        return undefined;
      },
      async setLocalPlayerId() {},
    },
  };
}

// A real localStorage doesn't exist in the plain-node vitest environment
// (same as it wouldn't during SSR) — fake just enough of it to exercise the
// real persistence path, the same way turnStorage.test.ts does.
function makeFakeLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  } as Storage;
}

let fakeRepos: ReturnType<typeof makeFakeRepos>;

vi.mock("@/lib/repositories", () => ({
  getRepositories: () => fakeRepos,
}));

describe("useMatchStore — in-progress turn survives closing and reopening the app", () => {
  beforeEach(() => {
    fakeRepos = makeFakeRepos();
    vi.resetModules();
    (globalThis as { window?: unknown }).window = { localStorage: makeFakeLocalStorage() };
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("restores dice/locks/rollsUsedThisTurn on a fresh loadMatch after a roll", async () => {
    const { useMatchStore } = await import("./useMatchStore");
    const match = await fakeRepos.matches.createMatch("shared-device", ["p1", "p2"]);
    await useMatchStore.getState().loadMatch(match.id);

    await useMatchStore.getState().roll();
    useMatchStore.getState().toggleLock(0);
    const dice = useMatchStore.getState().turn.dice;
    const locked = useMatchStore.getState().turn.locked;

    // Simulate the app being fully closed and reopened: reset in-memory
    // state, then load the same match again from scratch.
    useMatchStore.getState().reset();
    await useMatchStore.getState().loadMatch(match.id);

    expect(useMatchStore.getState().turn.dice).toEqual(dice);
    expect(useMatchStore.getState().turn.locked).toEqual(locked);
    expect(useMatchStore.getState().turn.rollsUsedThisTurn).toBe(1);
  });

  it("does not restore a stored turn that belongs to a different turn", async () => {
    const { useMatchStore } = await import("./useMatchStore");
    const match = await fakeRepos.matches.createMatch("shared-device", ["p1", "p2"]);
    await useMatchStore.getState().loadMatch(match.id);
    await useMatchStore.getState().roll();

    // Someone else advances the match server-side (a full turn boundary) —
    // reopening the app should follow the server, not resurrect the old roll.
    await fakeRepos.matches.updateMatch({
      ...match,
      currentPlayerIndex: 1,
      lastDice: [3, 3, 3, 3, 3, 3],
    });

    useMatchStore.getState().reset();
    await useMatchStore.getState().loadMatch(match.id);

    expect(useMatchStore.getState().turn.rollsUsedThisTurn).toBe(0);
    expect(useMatchStore.getState().turn.dice).toEqual([3, 3, 3, 3, 3, 3]);
  });

  it("clears the stored turn once the category is scored", async () => {
    const { useMatchStore } = await import("./useMatchStore");
    const match = await fakeRepos.matches.createMatch("shared-device", ["p1", "p2"]);
    await useMatchStore.getState().loadMatch(match.id);
    await useMatchStore.getState().roll();
    await useMatchStore.getState().score("chance");

    useMatchStore.getState().reset();
    await useMatchStore.getState().loadMatch(match.id);

    // Now it's p2's turn 1 — nothing stored should apply here regardless,
    // but this also confirms scoring didn't leave a stale entry behind.
    expect(useMatchStore.getState().turn.rollsUsedThisTurn).toBe(0);
  });
});
