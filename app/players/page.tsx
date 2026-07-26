"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { usePlayersStore } from "@/lib/store/usePlayersStore";
import { getProfiles, type Profile } from "@/lib/supabase/profiles";

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

export default function PlayersPage() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { players, localPlayerId, load, createPlayer } = usePlayersStore();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [profilesByUserId, setProfilesByUserId] = useState<Record<string, Profile>>({});

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const userIds = [
      ...new Set(players.map((p) => p.linkedUserId).filter((id): id is string => !!id)),
    ];
    if (userIds.length === 0) return;
    getProfiles(userIds).then(setProfilesByUserId);
  }, [players]);

  async function handleAdd() {
    if (adding) return;
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setNewName("");
    try {
      await createPlayer(name);
    } finally {
      setAdding(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-extrabold tracking-[.28em] text-gold">
            MAXI YATZY
          </div>
          <h1 className="font-serif text-3xl font-semibold text-paper">Spelare</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/profile" className="text-sm text-paper-dim hover:text-gold-bright">
            Min profil
          </Link>
          <Link href="/" className="text-sm text-paper-dim hover:text-gold-bright">
            Till matcher
          </Link>
        </div>
      </div>

      <p className="text-sm text-paper-dim">
        Spelarprofiler delas mellan alla dina matcher. Lägg till gäster (t.ex.
        familjemedlemmar utan eget konto) med bara ett namn — deras statistik sparas
        under det namnet nästa gång du väljer dem.
      </p>

      <div className="flex flex-col gap-1.5">
        {players.map((p) => {
          const avatarUrl =
            (p.linkedUserId ? profilesByUserId[p.linkedUserId]?.avatarUrl : undefined) ??
            p.avatarUrl ??
            undefined;
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
            >
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 text-[11px] font-extrabold text-paper-dim">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(p.name)
                )}
              </div>
              <span className="flex-1 text-paper">{p.name}</span>
              {p.id === localPlayerId && (
                <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-xs font-semibold text-gold-bright">
                  Du
                </span>
              )}
            </div>
          );
        })}
        {players.length === 0 && <p className="text-sm text-muted-dim">Inga spelare ännu.</p>}
      </div>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nytt spelarnamn"
          disabled={adding}
          className="flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-paper placeholder:text-muted-dim disabled:opacity-60"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="rounded-xl border border-gold/25 bg-white/5 px-4 py-2 font-semibold text-gold-bright disabled:opacity-60"
        >
          Lägg till
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
        <span className="text-xs text-muted">{user?.email}</span>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm text-paper-dim hover:text-gold-bright"
        >
          Logga ut
        </button>
      </div>
    </div>
  );
}
