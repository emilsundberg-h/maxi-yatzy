import type { SettingsRepository } from "@/lib/repositories/types";
import { getDb } from "./db";

const LOCAL_PLAYER_ID_KEY = "localPlayerId";

export class IndexedDbSettingsRepository implements SettingsRepository {
  async getLocalPlayerId(): Promise<string | undefined> {
    const db = await getDb();
    const row = await db.get("settings", LOCAL_PLAYER_ID_KEY);
    return row?.value;
  }

  async setLocalPlayerId(id: string): Promise<void> {
    const db = await getDb();
    await db.put("settings", { key: LOCAL_PLAYER_ID_KEY, value: id });
  }
}
