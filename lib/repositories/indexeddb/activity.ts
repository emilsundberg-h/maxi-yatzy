import type { ActivityEvent } from "@/lib/domain/types";
import type { ActivityRepository } from "@/lib/repositories/types";
import { getDb } from "./db";

export class IndexedDbActivityRepository implements ActivityRepository {
  async append(
    event: Omit<ActivityEvent, "id" | "createdAt">,
  ): Promise<ActivityEvent> {
    const fullEvent: ActivityEvent = {
      ...event,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const db = await getDb();
    await db.put("activity", fullEvent);
    return fullEvent;
  }

  async listByMatch(matchId: string): Promise<ActivityEvent[]> {
    const db = await getDb();
    // IndexedDB orders same-value index hits by primary key (insertion
    // order here), so no extra sort is needed — and sorting by the
    // `createdAt` string would be unsafe on millisecond-timestamp ties.
    return db.getAllFromIndex("activity", "by-matchId", matchId);
  }
}
