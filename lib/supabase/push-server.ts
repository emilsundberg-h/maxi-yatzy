import webpush, { type PushSubscription } from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@maxiyatzy.app", pub, priv);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface SubRow {
  endpoint: string;
  subscription: unknown;
}

async function deliver(supabase: SupabaseClient, subs: SubRow[], payload: PushPayload): Promise<void> {
  if (subs.length === 0) return;
  const body = JSON.stringify(payload);
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription as unknown as PushSubscription, body);
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(row.endpoint);
      }
    }),
  );

  if (dead.length) {
    await supabase.from("push_subscriptions").delete().in("endpoint", dead);
  }
}

/** Send to all of the given users' devices. Best-effort — never throws. */
export async function sendPushToUsers(
  supabase: SupabaseClient,
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  try {
    if (!ensureConfigured()) return;
    if (userIds.length === 0) return;
    const { data } = await supabase
      .from("push_subscriptions")
      .select("endpoint, subscription")
      .in("user_id", userIds);
    await deliver(supabase, (data ?? []) as SubRow[], payload);
  } catch {
    // best-effort
  }
}

/** Send to a single user's devices. Best-effort — never throws. */
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<void> {
  return sendPushToUsers(supabase, [userId], payload);
}
