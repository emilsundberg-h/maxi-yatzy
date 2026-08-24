import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivityEvent, GameType, Match, MatchMode, MatchStatus } from "@/lib/domain/types";
import type { Repositories } from "@/lib/repositories/types";
import type { PlacedMark } from "@/lib/domain/luffarschack";

// Same in-memory-repos approach as useMatchStore's own test suite
// (lib/store/useMatchStore.lastDice.test.ts) — the store logic under test
// runs against the real repository contract, only the persistence layer is
// swapped for a Map.
function makeFakeRepos(): Repositories & {
  matchesById: Map<string, Match>;
  appendedEvents: ActivityEvent[];
} {
  const matchesById = new Map<string, Match>();
  const appendedEvents: ActivityEvent[] = [];

  return {
    matchesById,
    appendedEvents,
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
      async linkPlayerToAccount() {},
      async deletePlayer() {},
    },
    matches: {
      async createMatch(mode: MatchMode, playerIds: string[], game: GameType) {
        const match: Match = {
          id: "m1",
          game,
          mode,
          status: "in_progress",
          playerIds,
          currentPlayerIndex: game === "luffarschack" ? 0 : 0,
          currentTurnNumber: 1,
          createdAt: "",
          updatedAt: "",
        };
        matchesById.set(match.id, match);
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
      async getMatchPlayer() {
        return undefined;
      },
      async listMatchPlayers() {
        return [];
      },
      async updateMatchPlayer() {},
      async inviteByEmail() {},
    },
    activity: {
      async append(event) {
        const full = { ...event, id: `a${appendedEvents.length + 1}`, createdAt: "" };
        appendedEvents.push(full);
        return full;
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

describe("useLuffarschackStore", () => {
  beforeEach(() => {
    fakeRepos = makeFakeRepos();
    vi.resetModules();
  });

  it("placing a mark advances the turn (mod 2), no winner yet", async () => {
    const { useLuffarschackStore } = await import("./useLuffarschackStore");
    const match = await fakeRepos.matches.createMatch("shared-device", ["p1", "p2"], "luffarschack");
    await useLuffarschackStore.getState().loadMatch(match.id);

    expect(useLuffarschackStore.getState().match?.currentPlayerIndex).toBe(0);
    await useLuffarschackStore.getState().placeMark(0, 0, []);

    const afterFirst = useLuffarschackStore.getState().match!;
    expect(afterFirst.currentPlayerIndex).toBe(1);
    expect(afterFirst.currentTurnNumber).toBe(1);
    expect(afterFirst.status).toBe("in_progress");

    const moves: PlacedMark[] = [{ x: 0, y: 0, mark: "kryss", playerId: "p1" }];
    await useLuffarschackStore.getState().placeMark(1, 0, moves);

    const afterSecond = useLuffarschackStore.getState().match!;
    expect(afterSecond.currentPlayerIndex).toBe(0);
    expect(afterSecond.currentTurnNumber).toBe(2);
  });

  it("a 5-in-a-row completes the match and records the winner", async () => {
    const { useLuffarschackStore } = await import("./useLuffarschackStore");
    const match = await fakeRepos.matches.createMatch("shared-device", ["p1", "p2"], "luffarschack");
    await useLuffarschackStore.getState().loadMatch(match.id);

    // p1 (kryss) plays (0,0)..(3,0), p2 (ring) plays (0,1)..(3,1) in
    // between — 8 alternating moves (4 each) leaves it p1's turn again for
    // the winning 9th move below.
    const moves: PlacedMark[] = [];
    const plays: Array<[number, number]> = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
      [2, 1],
      [3, 0],
      [3, 1],
    ];
    for (const [x, y] of plays) {
      await useLuffarschackStore.getState().placeMark(x, y, moves);
      const acting = useLuffarschackStore.getState().match!;
      // The player who just moved is whoever's turn it was *before* this
      // call flipped currentPlayerIndex — recover it via move count parity.
      const playerId = moves.length % 2 === 0 ? "p1" : "p2";
      moves.push({ x, y, mark: playerId === "p1" ? "kryss" : "ring", playerId });
      void acting;
    }
    expect(useLuffarschackStore.getState().match?.status).toBe("in_progress");

    // Winning move: p1 completes (4,0) for kryss 5-in-a-row.
    await useLuffarschackStore.getState().placeMark(4, 0, moves);

    const final = useLuffarschackStore.getState().match!;
    expect(final.status).toBe("completed");
    expect(final.winnerPlayerId).toBe("p1");
    expect(final.completedAt).toBeDefined();
  });

  it("rejects placing on an already-occupied cell", async () => {
    const { useLuffarschackStore } = await import("./useLuffarschackStore");
    const match = await fakeRepos.matches.createMatch("shared-device", ["p1", "p2"], "luffarschack");
    await useLuffarschackStore.getState().loadMatch(match.id);

    const moves: PlacedMark[] = [{ x: 0, y: 0, mark: "kryss", playerId: "p1" }];
    const beforeIndex = useLuffarschackStore.getState().match?.currentPlayerIndex;
    const eventsBefore = fakeRepos.appendedEvents.length;

    await useLuffarschackStore.getState().placeMark(0, 0, moves);

    expect(useLuffarschackStore.getState().match?.currentPlayerIndex).toBe(beforeIndex);
    expect(fakeRepos.appendedEvents.length).toBe(eventsBefore);
  });

  it("rejects placing once the match is completed", async () => {
    const { useLuffarschackStore } = await import("./useLuffarschackStore");
    const match = await fakeRepos.matches.createMatch("shared-device", ["p1", "p2"], "luffarschack");
    await fakeRepos.matches.updateMatch({
      ...match,
      status: "completed",
      completedAt: "now",
      winnerPlayerId: "p1",
    });
    await useLuffarschackStore.getState().loadMatch(match.id);

    const eventsBefore = fakeRepos.appendedEvents.length;
    await useLuffarschackStore.getState().placeMark(5, 5, []);

    expect(fakeRepos.appendedEvents.length).toBe(eventsBefore);
    expect(useLuffarschackStore.getState().match?.status).toBe("completed");
  });
});
