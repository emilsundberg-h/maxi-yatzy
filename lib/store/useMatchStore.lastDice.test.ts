import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ActivityEvent,
  Match,
  MatchMode,
  MatchPlayer,
  MatchStatus,
} from "@/lib/domain/types";
import type { Repositories } from "@/lib/repositories/types";

// An in-memory stand-in for the Supabase-backed repositories, sharing the
// exact same contract, so the store logic under test (in particular, how
// it seeds a player's next turn from their last-turn dice) runs unchanged
// from production — only the persistence layer is swapped.
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
      async getMatchPlayer(matchId: string, playerId: string) {
        return matchPlayersByKey.get(key(matchId, playerId));
      },
      async listMatchPlayers(matchId: string) {
        return [...matchPlayersByKey.values()].filter((mp) => mp.matchId === matchId);
      },
      async updateMatchPlayer(matchPlayer: MatchPlayer) {
        // Mirrors the real Supabase repo: only scores/pool/last_dice are
        // ever sent over the wire, so round-trip through that same shape
        // rather than just storing the object as-is.
        matchPlayersByKey.set(key(matchPlayer.matchId, matchPlayer.playerId), {
          ...matchPlayer,
          scores: matchPlayer.scores,
          pool: matchPlayer.pool,
          lastDice: matchPlayer.lastDice,
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

let fakeRepos: ReturnType<typeof makeFakeRepos>;

vi.mock("@/lib/repositories", () => ({
  getRepositories: () => fakeRepos,
}));

describe("useMatchStore — seeding a turn's dice from the player's own last roll", () => {
  beforeEach(() => {
    fakeRepos = makeFakeRepos();
    vi.resetModules();
  });

  it("shows each player's own previous roll at the start of their next turn, not [1,1,1,1,1,1]", async () => {
    const { useMatchStore } = await import("./useMatchStore");
    const match = await fakeRepos.matches.createMatch("shared-device", ["p1", "p2"]);

    await useMatchStore.getState().loadMatch(match.id);
    expect(useMatchStore.getState().match?.currentPlayerIndex).toBe(0);
    expect(useMatchStore.getState().turn.dice).toEqual([1, 1, 1, 1, 1, 1]);

    // Player 1 rolls and scores "onePair" (any category — the dice values
    // are whatever the real RNG produced, we just need to remember them).
    await useMatchStore.getState().roll();
    const p1Roll = useMatchStore.getState().turn.dice;
    await useMatchStore.getState().score("onePair");

    // Now it's player 2's turn — they've never played, so ones is correct.
    expect(useMatchStore.getState().match?.currentPlayerIndex).toBe(1);
    expect(useMatchStore.getState().turn.dice).toEqual([1, 1, 1, 1, 1, 1]);

    // Player 2 rolls and scores.
    await useMatchStore.getState().roll();
    const p2Roll = useMatchStore.getState().turn.dice;
    await useMatchStore.getState().score("onePair");

    // Back to player 1 — should now show player 1's OWN last roll, not ones.
    expect(useMatchStore.getState().match?.currentPlayerIndex).toBe(0);
    expect(useMatchStore.getState().turn.dice).toEqual(p1Roll);
    expect(useMatchStore.getState().turn.dice).not.toEqual([1, 1, 1, 1, 1, 1]);

    // Player 1 rolls and scores again.
    await useMatchStore.getState().roll();
    await useMatchStore.getState().score("twoPairs");

    // Player 2's turn again — should show player 2's OWN last roll.
    expect(useMatchStore.getState().match?.currentPlayerIndex).toBe(1);
    expect(useMatchStore.getState().turn.dice).toEqual(p2Roll);
  });

  it("a freshly-loaded client (e.g. a second device) sees the same seeded dice", async () => {
    const { useMatchStore } = await import("./useMatchStore");
    const match = await fakeRepos.matches.createMatch("separate-devices", ["p1", "p2"]);

    await useMatchStore.getState().loadMatch(match.id);
    await useMatchStore.getState().roll();
    const p1Roll = useMatchStore.getState().turn.dice;
    await useMatchStore.getState().score("onePair");
    await useMatchStore.getState().roll();
    await useMatchStore.getState().score("onePair"); // player 2's turn

    // Simulate a brand new client (a different device/tab) loading the
    // match fresh right as it becomes player 1's turn again.
    vi.resetModules();
    const { useMatchStore: freshStore } = await import("./useMatchStore");
    await freshStore.getState().loadMatch(match.id);

    expect(freshStore.getState().match?.currentPlayerIndex).toBe(0);
    expect(freshStore.getState().turn.dice).toEqual(p1Roll);
  });
});
