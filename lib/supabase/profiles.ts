import { getSupabaseClient } from "./client";

export interface Profile {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
}

interface ProfileRow {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
}

function toProfile(row: ProfileRow): Profile {
  return { userId: row.user_id, username: row.username, avatarUrl: row.avatar_url };
}

export async function getProfile(userId: string): Promise<Profile | undefined> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, username, avatar_url")
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();
  if (error) throw error;
  return data ? toProfile(data) : undefined;
}

export async function getProfiles(userIds: string[]): Promise<Record<string, Profile>> {
  if (userIds.length === 0) return {};
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, username, avatar_url")
    .in("user_id", userIds)
    .returns<ProfileRow[]>();
  if (error) throw error;
  const result: Record<string, Profile> = {};
  for (const row of data ?? []) result[row.user_id] = toProfile(row);
  return result;
}

export async function updateUsername(userId: string, username: string): Promise<void> {
  const supabase = getSupabaseClient();
  // Upsert rather than update: right after signup, ensureProfile's own
  // insert may not have landed yet, and a plain UPDATE against a
  // not-yet-existing row silently matches zero rows and discards the
  // chosen username once ensureProfile's insert completes afterward.
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, username, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/**
 * Every other registered account, so the new-match player picker can list
 * them directly instead of requiring the inviter to already know and type
 * their exact username. Small friend-group scale app — a flat capped list
 * is simpler than a paginated directory.
 */
export async function listProfiles(excludeUserId?: string): Promise<Profile[]> {
  const supabase = getSupabaseClient();
  let q = supabase
    .from("profiles")
    .select("user_id, username, avatar_url")
    .not("username", "is", null)
    .order("username", { ascending: true })
    .limit(50);
  if (excludeUserId) q = q.neq("user_id", excludeUserId);
  const { data, error } = await q.returns<ProfileRow[]>();
  if (error) throw error;
  return (data ?? []).map(toProfile);
}
