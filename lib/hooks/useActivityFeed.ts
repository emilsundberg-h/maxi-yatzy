"use client";

import { useEffect, useState } from "react";
import type { ActivityEvent } from "@/lib/domain/types";
import { getRepositories } from "@/lib/repositories";
import { toActivityEvent, type ActivityRow } from "@/lib/repositories/supabase/mappers";
import { createAuthedChannel } from "@/lib/supabase/authedChannel";

/**
 * Loads the match's activity log once, then streams new entries live via
 * Supabase Realtime (INSERT events on `activity`) instead of polling.
 */
export function useActivityFeed(matchId: string | undefined): ActivityEvent[] {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [trackedMatchId, setTrackedMatchId] = useState(matchId);
  if (matchId !== trackedMatchId) {
    setTrackedMatchId(matchId);
    setEvents([]);
  }

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;

    async function loadInitial() {
      const repos = getRepositories();
      const list = await repos.activity.listByMatch(matchId as string);
      if (!cancelled) setEvents(list);
    }
    loadInitial();

    const unsubscribe = createAuthedChannel(`activity-feed:${matchId}`, (channel) => {
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const event = toActivityEvent(payload.new as ActivityRow);
          setEvents((prev) => [...prev, event]);
        },
      );
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [matchId]);

  return events;
}
