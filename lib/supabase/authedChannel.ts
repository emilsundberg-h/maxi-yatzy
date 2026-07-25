import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient } from "./client";

/**
 * Creates a Realtime channel only after confirming the socket has the
 * current session's access token set. A channel created before `setAuth()`
 * has run joins without auth and silently never receives any RLS-gated
 * postgres_changes event — no error anywhere, it just never fires. Confirmed
 * by inspecting the raw websocket frames: a channel's `phx_join` payload has
 * no `access_token` field unless this ordering is enforced.
 */
export function createAuthedChannel(
  name: string,
  configure: (channel: RealtimeChannel) => void,
): () => void {
  const supabase = getSupabaseClient();
  let cancelled = false;
  let channel: RealtimeChannel | undefined;

  supabase.auth.getSession().then(({ data }) => {
    if (cancelled) return;
    supabase.realtime.setAuth(data.session?.access_token ?? null).then(() => {
      if (cancelled) return;
      channel = supabase.channel(name);
      configure(channel);
      channel.subscribe();
    });
  });

  return () => {
    cancelled = true;
    if (channel) supabase.removeChannel(channel);
  };
}
