import { SupabaseActivityRepository } from "./supabase/activity";
import { SupabaseMatchRepository } from "./supabase/matches";
import { SupabasePlayerRepository } from "./supabase/players";
import { SupabaseSettingsRepository } from "./supabase/settings";
import type { Repositories } from "./types";

export type { Repositories } from "./types";

let repositories: Repositories | undefined;

/**
 * Single swap point. Was IndexedDB-backed (see ./indexeddb — kept in the repo,
 * still tested, useful reference for the interface); now Supabase-backed for
 * real cross-device sync. Nothing outside this file should import a specific
 * implementation directly.
 */
export function getRepositories(): Repositories {
  if (!repositories) {
    repositories = {
      players: new SupabasePlayerRepository(),
      matches: new SupabaseMatchRepository(),
      activity: new SupabaseActivityRepository(),
      settings: new SupabaseSettingsRepository(),
    };
  }
  return repositories;
}
