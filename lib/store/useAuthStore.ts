import type { User } from "@supabase/supabase-js";
import { create } from "zustand";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ensureProfile, ensureSelfPlayer } from "@/lib/supabase/bootstrap";

interface AuthStoreState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  init: () => void;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,

  init() {
    if (get().initialized) return;
    set({ initialized: true });
    const supabase = getSupabaseClient();
    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      set({ user });
      // Keeps the Realtime socket's auth in sync as the session refreshes
      // over time (sign-in, token refresh, sign-out). Individual channel
      // creation (see lib/supabase/authedChannel.ts) additionally sets this
      // itself right before joining — a channel created before its first
      // setAuth() call joins with no access_token and silently never
      // receives any RLS-gated postgres_changes event, so this alone isn't
      // sufficient for channels created very early (e.g. on initial mount).
      void supabase.realtime.setAuth(session?.access_token ?? null);
      if (!user) {
        set({ loading: false });
        return;
      }
      // Keep `loading: true` until the self player row is guaranteed to
      // exist — pages gate their own "no players yet" empty states on this,
      // so without waiting here they could briefly race ahead of bootstrap.
      Promise.all([ensureSelfPlayer(user.id, user.email), ensureProfile(user.id, user.email)]).finally(
        () => set({ loading: false }),
      );
    });
  },

  async signInWithPassword(email, password) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  async signUp(email, password) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    return {
      error: error?.message ?? null,
      needsEmailConfirmation: !error && !data.session,
    };
  },

  async signOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
