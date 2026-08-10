import type {
  ActivityEvent,
  Match,
  MatchMode,
  MatchPlayer,
  MatchStatus,
  Player,
} from "@/lib/domain/types";

export interface PlayerRepository {
  createPlayer(name: string): Promise<Player>;
  getPlayer(id: string): Promise<Player | undefined>;
  listPlayers(): Promise<Player[]>;
  renamePlayer(id: string, name: string): Promise<void>;
  /**
   * Attributes this player row's match history to `userId`'s own stats
   * (see canonicalPlayerId) without going through the cross-device invite
   * flow — for shared-device matches, whoever the row belongs to is right
   * there at the same screen, so there's no separate device to confirm
   * from. No-op where there's no concept of other users (e.g. local-only
   * storage).
   */
  linkPlayerToAccount(id: string, userId: string): Promise<void>;
}

export interface MatchRepository {
  createMatch(mode: MatchMode, playerIds: string[]): Promise<Match>;
  getMatch(id: string): Promise<Match | undefined>;
  listMatches(filter?: { status?: MatchStatus }): Promise<Match[]>;
  updateMatch(match: Match): Promise<void>;
  /** Permanently removes the match and its players/activity (cascades). */
  deleteMatch(id: string): Promise<void>;
  getMatchPlayer(
    matchId: string,
    playerId: string,
  ): Promise<MatchPlayer | undefined>;
  listMatchPlayers(matchId: string): Promise<MatchPlayer[]>;
  updateMatchPlayer(matchPlayer: MatchPlayer): Promise<void>;
  /**
   * Invite whoever logs in with this email to control `playerId`'s turns in
   * `matchId` (separate-devices mode). No-op where there's no concept of
   * other users (e.g. local-only storage).
   */
  inviteByEmail(matchId: string, playerId: string, email: string): Promise<void>;
}

export interface ActivityRepository {
  append(
    event: Omit<ActivityEvent, "id" | "createdAt">,
  ): Promise<ActivityEvent>;
  listByMatch(matchId: string): Promise<ActivityEvent[]>;
}

export interface SettingsRepository {
  getLocalPlayerId(): Promise<string | undefined>;
  setLocalPlayerId(id: string): Promise<void>;
}

export interface Repositories {
  players: PlayerRepository;
  matches: MatchRepository;
  activity: ActivityRepository;
  settings: SettingsRepository;
}
