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
}
