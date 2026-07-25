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
}

export interface MatchRepository {
  createMatch(mode: MatchMode, playerIds: string[]): Promise<Match>;
  getMatch(id: string): Promise<Match | undefined>;
  listMatches(filter?: { status?: MatchStatus }): Promise<Match[]>;
  updateMatch(match: Match): Promise<void>;
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
