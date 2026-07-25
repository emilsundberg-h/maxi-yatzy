"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { MatchMode } from "@/lib/domain/types";
import { getRepositories } from "@/lib/repositories";
import { usePlayersStore } from "@/lib/store/usePlayersStore";
import { searchProfilesByUsername, type Profile } from "@/lib/supabase/profiles";

function pillClass(active: boolean) {
  return `flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
    active
      ? "text-[#241a08]"
      : "border border-white/10 bg-white/5 text-paper-dim"
  }`;
}

interface InviteTarget {
  userId?: string;
  email?: string;
}

function avatarInitials(text: string | null): string {
  return (text ?? "?").trim().slice(0, 2).toUpperCase() || "?";
}

function InvitePicker({
  playerName,
  onChange,
}: {
  playerName: string;
  onChange: (target: InviteTarget | undefined) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | undefined>();
  const [useEmail, setUseEmail] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!query.trim() || selectedProfile) return;
    const timeout = setTimeout(() => {
      setSearching(true);
      searchProfilesByUsername(query)
        .then(setResults)
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, selectedProfile]);

  const visibleResults = !selectedProfile && query.trim() ? results : [];

  function selectProfile(p: Profile) {
    setSelectedProfile(p);
    setQuery(p.username ?? "");
    setResults([]);
    onChange({ userId: p.userId });
  }

  function clearSelection() {
    setSelectedProfile(undefined);
    setQuery("");
    onChange(undefined);
  }

  function handleEmailChange(v: string) {
    setEmail(v);
    onChange(v.trim() ? { email: v.trim() } : undefined);
  }

  if (useEmail) {
    return (
      <div className="mt-2">
        <input
          type="email"
          value={email}
          onChange={(e) => handleEmailChange(e.target.value)}
          placeholder={`${playerName}s e-post`}
          className="w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-sm text-paper placeholder:text-muted-dim"
        />
        <button
          type="button"
          onClick={() => {
            setUseEmail(false);
            handleEmailChange("");
          }}
          className="mt-1 text-xs text-paper-dim hover:text-gold-bright"
        >
          Sök användarnamn istället
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      {selectedProfile ? (
        <div className="flex items-center gap-2 rounded-lg border border-gold/25 bg-gold/10 px-2.5 py-2 text-sm">
          <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/10 text-[10px] font-bold text-paper-dim">
            {selectedProfile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              avatarInitials(selectedProfile.username)
            )}
          </div>
          <span className="flex-1 text-paper">{selectedProfile.username}</span>
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-paper-dim hover:text-gold-bright"
          >
            Ändra
          </button>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Sök användarnamn för ${playerName}`}
            className="w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-sm text-paper placeholder:text-muted-dim"
          />
          {searching && <p className="mt-1 text-xs text-muted-dim">Söker...</p>}
          {visibleResults.length > 0 && (
            <div className="mt-1 flex flex-col gap-1 rounded-lg border border-white/10 bg-black/40 p-1">
              {visibleResults.map((p) => (
                <button
                  key={p.userId}
                  type="button"
                  onClick={() => selectProfile(p)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-paper hover:bg-white/10"
                >
                  <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/10 text-[10px] font-bold text-paper-dim">
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      avatarInitials(p.username)
                    )}
                  </div>
                  {p.username}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setUseEmail(true)}
            className="mt-1 text-xs text-paper-dim hover:text-gold-bright"
          >
            Hittar du inte dem? Bjud in via e-post
          </button>
        </>
      )}
    </div>
  );
}

export default function NewMatchPage() {
  const router = useRouter();
  const { players, load, createPlayer, localPlayerId } = usePlayersStore();
  const [mode, setMode] = useState<MatchMode>("shared-device");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteTargets, setInviteTargets] = useState<Record<string, InviteTarget>>({});
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleAddPlayer() {
    // Guard against a fast double-tap firing two overlapping creations —
    // without this, the second player added in quick succession could be
    // dropped entirely before this component re-renders with the cleared
    // input, silently ending up out of the match's player list.
    if (addingPlayer) return;
    const name = newName.trim();
    if (!name) return;
    setAddingPlayer(true);
    setNewName("");
    try {
      const player = await createPlayer(name);
      setSelectedIds((prev) => [...prev, player.id]);
    } finally {
      setAddingPlayer(false);
    }
  }

  async function handleStart() {
    if (selectedIds.length < 1) return;
    setCreating(true);
    const repos = getRepositories();
    const match = await repos.matches.createMatch(mode, selectedIds);
    if (mode === "separate-devices") {
      await Promise.all(
        selectedIds
          .filter((id) => id !== localPlayerId && inviteTargets[id])
          .map((id) =>
            fetch("/api/invites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                matchId: match.id,
                playerId: id,
                invitedUserId: inviteTargets[id].userId,
                invitedEmail: inviteTargets[id].email,
              }),
            }),
          ),
      );
    }
    router.push(`/match/${match.id}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6 pt-8">
      <div>
        <div className="text-[10px] font-extrabold tracking-[.28em] text-gold">
          MAXI YATZY
        </div>
        <h1 className="font-serif text-3xl font-semibold text-paper">Ny match</h1>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-extrabold tracking-[.2em] text-sage">LÄGE</p>
        <div className="flex gap-2 rounded-2xl bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setMode("shared-device")}
            className={pillClass(mode === "shared-device")}
            style={
              mode === "shared-device"
                ? { background: "linear-gradient(150deg,#e6d0a0,#c7a862)" }
                : undefined
            }
          >
            Skicka runt enheten
          </button>
          <button
            type="button"
            onClick={() => setMode("separate-devices")}
            className={pillClass(mode === "separate-devices")}
            style={
              mode === "separate-devices"
                ? { background: "linear-gradient(150deg,#e6d0a0,#c7a862)" }
                : undefined
            }
          >
            Egna enheter
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-extrabold tracking-[.2em] text-sage">
          SPELARE ({selectedIds.length})
        </p>
        <div className="flex flex-col gap-1.5">
          {players.map((p) => {
            const isSelf = p.id === localPlayerId;
            const isSelected = selectedIds.includes(p.id);
            const showInvite = mode === "separate-devices" && isSelected && !isSelf;
            return (
              <div
                key={p.id}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
              >
                <label className="flex items-center gap-2 text-paper">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(p.id)}
                    className="accent-[#c9a959]"
                  />
                  <span>{p.name}</span>
                  {isSelf && <span className="ml-auto text-xs text-muted">Du</span>}
                </label>
                {showInvite && (
                  <InvitePicker
                    playerName={p.name}
                    onChange={(target) =>
                      setInviteTargets((prev) => {
                        const next = { ...prev };
                        if (target) next[p.id] = target;
                        else delete next[p.id];
                        return next;
                      })
                    }
                  />
                )}
              </div>
            );
          })}
          {players.length === 0 && (
            <p className="text-sm text-muted-dim">Inga spelare ännu — lägg till en nedan.</p>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nytt spelarnamn"
            disabled={addingPlayer}
            className="flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-paper placeholder:text-muted-dim disabled:opacity-60"
            onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
          />
          <button
            type="button"
            onClick={handleAddPlayer}
            disabled={addingPlayer}
            className="rounded-xl border border-gold/25 bg-white/5 px-4 py-2 font-semibold text-gold-bright disabled:opacity-60"
          >
            Lägg till
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={selectedIds.length === 0 || creating}
        onClick={handleStart}
        className="rounded-2xl px-6 py-3.5 font-extrabold tracking-[.06em] text-[#241708] shadow-[0_12px_26px_rgba(0,0,0,.4)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: "linear-gradient(150deg,#eecb7c,#b98d38)" }}
      >
        STARTA MATCH
      </button>
    </div>
  );
}
