import { getSupabaseClient } from "./client";

/**
 * Every authenticated account needs exactly one "self" player row — the one
 * that represents them as a participant (not just a match owner). Guest
 * players added by name have `linked_user_id is null`; this one has it set
 * to their own id. Idempotent: safe to call on every login.
 */
export async function ensureSelfPlayer(
  userId: string,
  email: string | undefined,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: existing, error: selectError } = await supabase
    .from("players")
    .select("id")
    .eq("owner_user_id", userId)
    .eq("linked_user_id", userId)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return;

  // Strip a "+alias" suffix (common for spam-filtering aliases and test
  // accounts) so the default display name stays short and presentable.
  const defaultName = email ? email.split("@")[0].split("+")[0] : "Jag";
  const { error: insertError } = await supabase.from("players").insert({
    name: defaultName,
    owner_user_id: userId,
    linked_user_id: userId,
  });
  // A concurrent call (onAuthStateChange can fire more than once in quick
  // succession on load) may have inserted the self player between our
  // SELECT above and this INSERT. The partial unique index on
  // (owner_user_id) where linked_user_id = owner_user_id turns that race
  // into a 23505 here instead of a silent duplicate row.
  if (insertError && insertError.code !== "23505") throw insertError;
}

/**
 * Every authenticated account also gets a `profiles` row (username + avatar),
 * the publicly-searchable identity used to find and invite people. Idempotent.
 */
export async function ensureProfile(userId: string, email: string | undefined): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return;

  const defaultUsername = email ? email.split("@")[0].split("+")[0] : null;
  const { error: insertError } = await supabase
    .from("profiles")
    .insert({ user_id: userId, username: defaultUsername });
  if (!insertError) return;

  if (insertError.code === "23505") {
    // Two distinct causes share the 23505 code: (a) a concurrent call
    // (onAuthStateChange can fire more than once in quick succession on
    // load) already created our row — nothing left to do; (b) someone
    // else already has this default username — retry without one.
    // Re-select to tell them apart instead of guessing.
    const { data: nowExisting } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (nowExisting) return;

    const { error: retryError } = await supabase
      .from("profiles")
      .insert({ user_id: userId, username: null });
    if (!retryError || retryError.code === "23505") return;
    throw retryError;
  }
  throw insertError;
}
