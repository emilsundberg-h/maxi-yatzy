import type { ActivityEvent } from "@/lib/domain/types";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { ActivityRepository } from "@/lib/repositories/types";
import { toActivityEvent, type ActivityRow } from "./mappers";

export class SupabaseActivityRepository implements ActivityRepository {
  async append(event: Omit<ActivityEvent, "id" | "createdAt">): Promise<ActivityEvent> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("activity")
      .insert({
        match_id: event.matchId,
        player_id: event.playerId,
        turn_number: event.turnNumber,
        type: event.type,
        payload: event.payload,
      })
      .select()
      .single<ActivityRow>();
    if (error) throw error;
    return toActivityEvent(data);
  }

  async listByMatch(matchId: string): Promise<ActivityEvent[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("activity")
      .select()
      .eq("match_id", matchId)
      .order("created_at", { ascending: true })
      .returns<ActivityRow[]>();
    if (error) throw error;
    return (data ?? []).map(toActivityEvent);
  }
}
