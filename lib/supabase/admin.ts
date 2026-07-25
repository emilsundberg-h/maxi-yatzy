import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS entirely. Server-only, never import this
 * from client code. Used only where RLS genuinely can't do the job: reading
 * another user's push subscriptions to send to them, and the avatar Storage
 * upload.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
