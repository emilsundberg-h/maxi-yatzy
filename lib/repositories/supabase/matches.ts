import type { Match, MatchMode, MatchPlayer, MatchStatus } from "@/lib/domain/types";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { MatchRepository } from "@/lib/repositories/types";
import { requireUserId } from "./auth-helpers";
import { toMatch, toMatchPlayer, type MatchPlayerRow, type MatchRow } from "./mappers";

export class SupabaseMatchRepository implements MatchRepository {
  async createMatch(mode: MatchMode, playerIds: string[]): Promise<Match> {
    const supabase = getSupabaseClient();
    const ownerUserId = await requireUserId();

    const { data, error } = await supabase
      .from("matches")
      .insert({
        mode,
        player_ids: playerIds,
        // Random starting player; every turn after that rotates in playerIds
        // order (see useMatchStore's score() action).
        current_player_index: Math.floor(Math.random() * playerIds.length),
        owner_user_id: ownerUserId,
      })
      .select()
      .single<MatchRow>();
    if (error) throw error;
    const match = toMatch(data);

    const { error: matchPlayersError } = await supabase.from("match_players").insert(
      playerIds.map((playerId) => ({ match_id: match.id, player_id: playerId })),
    );
    if (matchPlayersError) throw matchPlayersError;

    return match;
  }

  async getMatch(id: string): Promise<Match | undefined> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("matches")
      .select()
      .eq("id", id)
      .maybeSingle<MatchRow>();
    if (error) throw error;
    return data ? toMatch(data) : undefined;
  }

  async listMatches(filter?: { status?: MatchStatus }): Promise<Match[]> {
    const supabase = getSupabaseClient();
    let query = supabase.from("matches").select().order("updated_at", { ascending: false });
    if (filter?.status) query = query.eq("status", filter.status);
    const { data, error } = await query.returns<MatchRow[]>();
    if (error) throw error;
    return (data ?? []).map(toMatch);
  }

  async updateMatch(match: Match): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("matches")
      .update({
        mode: match.mode,
        status: match.status,
        player_ids: match.playerIds,
        current_player_index: match.currentPlayerIndex,
        current_turn_number: match.currentTurnNumber,
        updated_at: new Date().toISOString(),
        completed_at: match.completedAt ?? null,
      })
      .eq("id", match.id);
    if (error) throw error;
  }

  async getMatchPlayer(matchId: string, playerId: string): Promise<MatchPlayer | undefined> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("match_players")
      .select()
      .eq("match_id", matchId)
      .eq("player_id", playerId)
      .maybeSingle<MatchPlayerRow>();
    if (error) throw error;
    return data ? toMatchPlayer(data) : undefined;
  }

  async listMatchPlayers(matchId: string): Promise<MatchPlayer[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("match_players")
      .select()
      .eq("match_id", matchId)
      .returns<MatchPlayerRow[]>();
    if (error) throw error;
    return (data ?? []).map(toMatchPlayer);
  }

  async updateMatchPlayer(matchPlayer: MatchPlayer): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("match_players")
      .update({
        scores: matchPlayer.scores,
        pool: matchPlayer.pool,
        last_dice: matchPlayer.lastDice ?? null,
      })
      .eq("match_id", matchPlayer.matchId)
      .eq("player_id", matchPlayer.playerId);
    if (error) throw error;
  }

  async inviteByEmail(matchId: string, playerId: string, email: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("match_invites").insert({
      match_id: matchId,
      player_id: playerId,
      invited_email: email.trim().toLowerCase(),
    });
    if (error) throw error;
  }
}
