import { getSupabaseClient } from "@/lib/supabase/client";
import type { SettingsRepository } from "@/lib/repositories/types";
import { requireUserId } from "./auth-helpers";

export class SupabaseSettingsRepository implements SettingsRepository {
  async getLocalPlayerId(): Promise<string | undefined> {
    const supabase = getSupabaseClient();
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from("players")
      .select("id")
      .eq("owner_user_id", userId)
      .eq("linked_user_id", userId)
      .maybeSingle<{ id: string }>();
    if (error) throw error;
    return data?.id;
  }

  async setLocalPlayerId(): Promise<void> {
    // No-op: with real accounts, "who am I" is the authenticated session's
    // own player row (linked_user_id = auth.uid()), bootstrapped once at
    // login (see lib/supabase/bootstrap.ts) rather than manually chosen.
  }
}
