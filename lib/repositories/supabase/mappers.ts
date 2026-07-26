import type { ActivityEvent, Match, MatchPlayer, Player } from "@/lib/domain/types";

// Row shapes matching supabase/migrations/0001_init.sql — kept local to the
// mapper functions rather than generated types, since the schema is small
// and stable.

export interface PlayerRow {
  id: string;
  name: string;
  created_at: string;
  linked_user_id: string | null;
  avatar_url: string | null;
}

export interface MatchRow {
  id: string;
  mode: Match["mode"];
  status: Match["status"];
  player_ids: string[];
  current_player_index: number;
  current_turn_number: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface MatchPlayerRow {
  match_id: string;
  player_id: string;
  scores: MatchPlayer["scores"];
  pool: number;
}

export interface ActivityRow {
  id: string;
  match_id: string;
  player_id: string;
  turn_number: number;
  type: ActivityEvent["type"];
  payload: unknown;
  created_at: string;
}

export function toPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    linkedUserId: row.linked_user_id,
    avatarUrl: row.avatar_url,
  };
}

export function toMatch(row: MatchRow): Match {
  return {
    id: row.id,
    mode: row.mode,
    status: row.status,
    playerIds: row.player_ids,
    currentPlayerIndex: row.current_player_index,
    currentTurnNumber: row.current_turn_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined,
  };
}

export function toMatchPlayer(row: MatchPlayerRow): MatchPlayer {
  return {
    matchId: row.match_id,
    playerId: row.player_id,
    scores: row.scores ?? {},
    pool: row.pool,
  };
}

export function toActivityEvent(row: ActivityRow): ActivityEvent {
  return {
    id: row.id,
    matchId: row.match_id,
    playerId: row.player_id,
    turnNumber: row.turn_number,
    type: row.type,
    payload: row.payload,
    createdAt: row.created_at,
  };
}
