import type { Player } from "@/lib/domain/types";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { PlayerRepository } from "@/lib/repositories/types";
import { requireUserId } from "./auth-helpers";
import { toPlayer, type PlayerRow } from "./mappers";

export class SupabasePlayerRepository implements PlayerRepository {
  async createPlayer(name: string): Promise<Player> {
    const supabase = getSupabaseClient();
    const ownerUserId = await requireUserId();
    const { data, error } = await supabase
      .from("players")
      .insert({ name, owner_user_id: ownerUserId })
      .select()
      .single<PlayerRow>();
    if (error) throw error;
    return toPlayer(data);
  }

  async getPlayer(id: string): Promise<Player | undefined> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("players")
      .select()
      .eq("id", id)
      .maybeSingle<PlayerRow>();
    if (error) throw error;
    return data ? toPlayer(data) : undefined;
  }

  async listPlayers(): Promise<Player[]> {
    const supabase = getSupabaseClient();
    const ownerUserId = await requireUserId();
    const { data, error } = await supabase
      .from("players")
      .select()
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: true })
      .returns<PlayerRow[]>();
    if (error) throw error;
    return (data ?? []).map(toPlayer);
  }
}
