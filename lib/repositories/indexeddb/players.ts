import type { Player } from "@/lib/domain/types";
import type { PlayerRepository } from "@/lib/repositories/types";
import { getDb } from "./db";

export class IndexedDbPlayerRepository implements PlayerRepository {
  async createPlayer(name: string): Promise<Player> {
    const player: Player = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      linkedUserId: null,
      avatarUrl: null,
    };
    const db = await getDb();
    await db.put("players", player);
    return player;
  }

  async getPlayer(id: string): Promise<Player | undefined> {
    const db = await getDb();
    return db.get("players", id);
  }

  async listPlayers(): Promise<Player[]> {
    const db = await getDb();
    return db.getAll("players");
  }

  async renamePlayer(id: string, name: string): Promise<void> {
    const db = await getDb();
    const player = await db.get("players", id);
    if (!player) return;
    await db.put("players", { ...player, name });
  }

  async linkPlayerToAccount(id: string, userId: string): Promise<void> {
    const db = await getDb();
    const player = await db.get("players", id);
    if (!player) return;
    await db.put("players", { ...player, linkedUserId: userId });
  }

  async deletePlayer(id: string): Promise<void> {
    const db = await getDb();
    await db.delete("players", id);
  }
}
