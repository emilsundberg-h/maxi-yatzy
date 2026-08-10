import { create } from "zustand";
import type { Player } from "@/lib/domain/types";
import { getRepositories } from "@/lib/repositories";

interface PlayersStoreState {
  players: Player[];
  localPlayerId?: string;
  loading: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  createPlayer: (name: string) => Promise<Player>;
  renamePlayer: (playerId: string, name: string) => Promise<void>;
  linkPlayerToAccount: (playerId: string, userId: string) => Promise<void>;
  setLocalPlayerId: (id: string) => Promise<void>;
  setPlayerAvatar: (playerId: string, avatarUrl: string) => void;
}

export const usePlayersStore = create<PlayersStoreState>((set, get) => ({
  players: [],
  localPlayerId: undefined,
  loading: false,
  loaded: false,

  async load() {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    const repos = getRepositories();
    const [players, localPlayerId] = await Promise.all([
      repos.players.listPlayers(),
      repos.settings.getLocalPlayerId(),
    ]);
    set({ players, localPlayerId, loading: false, loaded: true });
  },

  async createPlayer(name: string) {
    const repos = getRepositories();
    const player = await repos.players.createPlayer(name);
    set({ players: [...get().players, player] });
    return player;
  },

  async renamePlayer(playerId: string, name: string) {
    const repos = getRepositories();
    await repos.players.renamePlayer(playerId, name);
    set({
      players: get().players.map((p) => (p.id === playerId ? { ...p, name } : p)),
    });
  },

  async linkPlayerToAccount(playerId: string, userId: string) {
    const repos = getRepositories();
    await repos.players.linkPlayerToAccount(playerId, userId);
    set({
      players: get().players.map((p) =>
        p.id === playerId ? { ...p, linkedUserId: userId } : p,
      ),
    });
  },

  async setLocalPlayerId(id: string) {
    const repos = getRepositories();
    await repos.settings.setLocalPlayerId(id);
    set({ localPlayerId: id });
  },

  setPlayerAvatar(playerId, avatarUrl) {
    set({
      players: get().players.map((p) => (p.id === playerId ? { ...p, avatarUrl } : p)),
    });
  },
}));
