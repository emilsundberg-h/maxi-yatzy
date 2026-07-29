import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ActivityEvent,
  Match,
  MatchMode,
  MatchPlayer,
  MatchStatus,
} from "@/lib/domain/types";
import type { Repositories } from "@/lib/repositories/types";

// Same in-memory stand-in shape as useMatchStore.lastDice.test.ts — kept
// local rather than shared, since each test file needs full control over
// exactly which repo state exists at each step.
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

let fakeRepos: ReturnType<typeof makeFakeRepos>;

vi.mock("@/lib/repositories", () => ({
  getRepositories: () => fakeRepos,
}));

describe("useMatchStore.refreshMatch — pull-to-refresh must not lose an in-progress roll", () => {
  beforeEach(() => {
    fakeRepos = makeFakeRepos();
    vi.resetModules();
  });

  it("preserves dice/locks/rollsUsedThisTurn when the turn hasn't changed server-side", async () => {
    const { useMatchStore } = await import("./useMatchStore");
    const match = await fakeRepos.matches.createMatch("shared-device", ["p1", "p2"]);
    await useMatchStore.getState().loadMatch(match.id);

    await useMatchStore.getState().roll();
    const rolledDice = useMatchStore.getState().turn.dice;
    const rollsUsed = useMatchStore.getState().turn.rollsUsedThisTurn;
    expect(rollsUsed).toBe(1);

    // Nothing about the match changed server-side (nobody scored) — a
    // pull-to-refresh here must not reset the roll the player already made.
    await useMatchStore.getState().refreshMatch(match.id);

    expect(useMatchStore.getState().turn.dice).toEqual(rolledDice);
    expect(useMatchStore.getState().turn.rollsUsedThisTurn).toBe(rollsUsed);
  });

  it("does reset the turn when the fetched match shows it's genuinely moved on", async () => {
    const { useMatchStore } = await import("./useMatchStore");
    const match = await fakeRepos.matches.createMatch("shared-device", ["p1", "p2"]);
    await useMatchStore.getState().loadMatch(match.id);

    await useMatchStore.getState().roll();
    expect(useMatchStore.getState().turn.rollsUsedThisTurn).toBe(1);

    // Simulate another device having advanced the turn in the meantime.
    await fakeRepos.matches.updateMatch({
      ...match,
      currentPlayerIndex: 1,
      lastDice: [2, 2, 2, 2, 2, 2],
    });

    await useMatchStore.getState().refreshMatch(match.id);

    expect(useMatchStore.getState().match?.currentPlayerIndex).toBe(1);
    expect(useMatchStore.getState().turn.rollsUsedThisTurn).toBe(0);
    expect(useMatchStore.getState().turn.dice).toEqual([2, 2, 2, 2, 2, 2]);
  });
});
