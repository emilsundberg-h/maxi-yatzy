"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MatchMode } from "@/lib/domain/types";
import { downscaleImage } from "@/lib/downscaleImage";
import { getRepositories } from "@/lib/repositories";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { usePlayersStore } from "@/lib/store/usePlayersStore";
import { getProfiles, listProfiles, type Profile } from "@/lib/supabase/profiles";

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
  currentUserId,
  initialProfile,
  onChange,
}: {
  playerName: string;
  currentUserId?: string;
  initialProfile?: Profile;
  onChange: (target: InviteTarget | undefined) => void;
}) {
  const [query, setQuery] = useState("");
  // Every other registered account, loaded once and filtered client-side —
  // the inviter should see who's available to invite right away instead of
  // having to already know and type someone's exact username first.
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Seeded when this player was added straight from the "other accounts"
  // list below — that tap already picked the account, so this picker
  // should open already showing that choice instead of a blank search.
  const [selectedProfile, setSelectedProfile] = useState<Profile | undefined>(initialProfile);
  const [useEmail, setUseEmail] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    listProfiles(currentUserId).then((profiles) => {
      setAllProfiles(profiles);
      setLoaded(true);
    });
  }, [currentUserId]);

  const trimmedQuery = query.trim().toLowerCase();
  const visibleResults = selectedProfile
    ? []
    : trimmedQuery
      ? allProfiles.filter((p) => p.username?.toLowerCase().includes(trimmedQuery))
      : allProfiles;

  function selectProfile(p: Profile) {
    setSelectedProfile(p);
    setQuery(p.username ?? "");
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
            placeholder={`Sök eller välj konto för ${playerName}`}
            className="w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-sm text-paper placeholder:text-muted-dim"
          />
          {!loaded && <p className="mt-1 text-xs text-muted-dim">Laddar konton...</p>}
          {loaded && visibleResults.length === 0 && (
            <p className="mt-1 text-xs text-muted-dim">
              {trimmedQuery ? "Ingen matchade." : "Inga andra konton hittades ännu."}
            </p>
          )}
          {visibleResults.length > 0 && (
            <div className="mt-1 flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-1">
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
  const { user } = useAuthStore();
  const { players, load, createPlayer, localPlayerId, setPlayerAvatar, linkPlayerToAccount } =
    usePlayersStore();
  const [mode, setMode] = useState<MatchMode>("separate-devices");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteTargets, setInviteTargets] = useState<Record<string, InviteTarget>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [newAvatarBlob, setNewAvatarBlob] = useState<Blob | null>(null);
  const [newAvatarPreview, setNewAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const newAvatarInputRef = useRef<HTMLInputElement>(null);
  const [profilesByUserId, setProfilesByUserId] = useState<Record<string, Profile>>({});
  // Every other registered account, so this page can offer "add Maja and
  // invite her" as one tap instead of requiring a guest player to be typed
  // in by name first and only then linked to her real account.
  const [otherProfiles, setOtherProfiles] = useState<Profile[]>([]);
  const [addingAccountId, setAddingAccountId] = useState<string | null>(null);
  const [preSelectedProfiles, setPreSelectedProfiles] = useState<Record<string, Profile>>({});
  const [accountError, setAccountError] = useState<string | null>(null);

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

  useEffect(() => {
    listProfiles(user?.id).then(setOtherProfiles);
  }, [user?.id]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  // Accounts already represented by a player in this roster (linked once
  // they've accepted an earlier invite, or already picked out for one below)
  // shouldn't also show up as "someone new to invite".
  const linkedUserIds = new Set(
    players.map((p) => p.linkedUserId).filter((id): id is string => !!id),
  );
  const targetedUserIds = new Set(
    Object.values(inviteTargets)
      .map((t) => t.userId)
      .filter((id): id is string => !!id),
  );
  const invitableProfiles = otherProfiles.filter(
    (p) => !linkedUserIds.has(p.userId) && !targetedUserIds.has(p.userId),
  );

  async function handleSelectAccount(p: Profile) {
    if (addingAccountId) return;
    setAddingAccountId(p.userId);
    setAccountError(null);
    try {
      const player = await createPlayer(p.username ?? "Spelare");
      setSelectedIds((prev) => [...prev, player.id]);
      setPreSelectedProfiles((prev) => ({ ...prev, [player.id]: p }));
      if (mode === "shared-device") {
        // Everyone's at the same screen in this mode, so there's no separate
        // device to send an invite to and confirm from — being picked here
        // already means they're sitting right here. Link the row to their
        // real account immediately so this match's stats attribute to them,
        // the same as if they'd played it on their own device.
        await linkPlayerToAccount(player.id, p.userId);
      } else {
        setInviteTargets((prev) => ({ ...prev, [player.id]: { userId: p.userId } }));
      }
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "Kunde inte lägga till kontot.");
    } finally {
      setAddingAccountId(null);
    }
  }

  function playerAvatarUrl(id: string): string | undefined {
    const p = players.find((x) => x.id === id);
    if (!p) return undefined;
    return (
      (p.linkedUserId ? profilesByUserId[p.linkedUserId]?.avatarUrl : undefined) ??
      // While the profilesByUserId fetch for a just-linked account is still
      // in flight, fall back to the profile picked from the account list —
      // avoids a flash of the initials placeholder for a split second.
      preSelectedProfiles[id]?.avatarUrl ??
      p.avatarUrl ??
      undefined
    );
  }

  async function handleNewAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    try {
      const blob = await downscaleImage(file);
      if (newAvatarPreview) URL.revokeObjectURL(newAvatarPreview);
      setNewAvatarBlob(blob);
      setNewAvatarPreview(URL.createObjectURL(blob));
    } catch {
      setAvatarError("Kunde inte läsa bilden.");
    } finally {
      if (newAvatarInputRef.current) newAvatarInputRef.current.value = "";
    }
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
    const avatarBlob = newAvatarBlob;
    if (newAvatarPreview) URL.revokeObjectURL(newAvatarPreview);
    setNewAvatarBlob(null);
    setNewAvatarPreview(null);
    try {
      const player = await createPlayer(name);
      setSelectedIds((prev) => [...prev, player.id]);
      if (avatarBlob) {
        try {
          const res = await fetch(`/api/players/${player.id}/avatar`, {
            method: "POST",
            headers: { "Content-Type": "image/jpeg" },
            body: avatarBlob,
          });
          const data = await res.json();
          if (res.ok) setPlayerAvatar(player.id, data.avatarUrl);
          else setAvatarError("Spelaren skapades, men bilden kunde inte sparas.");
        } catch {
          setAvatarError("Spelaren skapades, men bilden kunde inte sparas.");
        }
      }
    } finally {
      setAddingPlayer(false);
    }
  }

  async function handleStart() {
    if (selectedIds.length < 1) return;
    setCreating(true);
    setStartError(null);
    try {
      const repos = getRepositories();
      const match = await repos.matches.createMatch(mode, selectedIds);
      if (mode === "separate-devices") {
        // fetch() only rejects on network failure — it resolves normally for
        // 4xx/5xx responses too, so each result must be checked explicitly.
        // Otherwise a rejected/failed invite (e.g. a transient error) is
        // silently swallowed and the recipient never sees a request, with no
        // sign anything went wrong on the inviter's side either.
        const targets = selectedIds.filter((id) => id !== localPlayerId && inviteTargets[id]);
        const results = await Promise.all(
          targets.map(async (id) => {
            const res = await fetch("/api/invites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                matchId: match.id,
                playerId: id,
                invitedUserId: inviteTargets[id].userId,
                invitedEmail: inviteTargets[id].email,
              }),
            });
            if (res.ok) return { id, ok: true as const };
            const data = await res.json().catch(() => ({}));
            return { id, ok: false as const, error: data?.error as string | undefined };
          }),
        );
        const failed = results.filter((r) => !r.ok);
        if (failed.length > 0) {
          const names = failed
            .map((f) => players.find((p) => p.id === f.id)?.name ?? "spelare")
            .join(", ");
          setStartError(`Kunde inte bjuda in: ${names}. Matchen skapades ändå.`);
        }
      }
      router.push(`/match/${match.id}`);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Kunde inte starta matchen.");
    } finally {
      setCreating(false);
    }
  }

  const selectedNames = selectedIds
    .map((id) => players.find((p) => p.id === id)?.name)
    .filter((name): name is string => !!name);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-extrabold tracking-[.28em] text-gold">
            MAXI YATZY
          </div>
          <h1 className="font-serif text-3xl font-semibold text-paper">Ny match</h1>
        </div>
        <Link href="/" className="text-sm text-paper-dim hover:text-gold-bright">
          Till matcher
        </Link>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-extrabold tracking-[.2em] text-sage">LÄGE</p>
        <div className="flex gap-2 rounded-2xl bg-white/5 p-1">
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
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-extrabold tracking-[.2em] text-sage">SPELARE</p>
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-paper"
        >
          <span className="flex-1">
            {selectedNames.length > 0 ? selectedNames.join(", ") : "Spelare"}
          </span>
          <span className="text-xs text-paper-dim">{pickerOpen ? "▲" : "▼"}</span>
        </button>

        {pickerOpen && (
          <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-2">
            <div className="flex flex-col gap-1.5">
              {players.map((p) => {
                const isSelf = p.id === localPlayerId;
                const isSelected = selectedIds.includes(p.id);
                const showInvite = mode === "separate-devices" && isSelected && !isSelf;
                const avatarUrl = playerAvatarUrl(p.id);
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
                  >
                    <label className="flex items-center gap-2.5 text-paper">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(p.id)}
                        className="accent-[#c9a959]"
                      />
                      <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 text-[10px] font-bold text-paper-dim">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          avatarInitials(p.name)
                        )}
                      </div>
                      <span>{p.name}</span>
                      {isSelf && <span className="ml-auto text-xs text-muted">Du</span>}
                      {!isSelf && p.linkedUserId && (
                        <span className="ml-auto text-xs text-muted">Kopplat konto</span>
                      )}
                    </label>
                    {showInvite && (
                      <InvitePicker
                        playerName={p.name}
                        currentUserId={user?.id}
                        initialProfile={preSelectedProfiles[p.id]}
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

            {invitableProfiles.length > 0 && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-1.5 text-[10px] font-extrabold tracking-[.2em] text-sage">
                  {mode === "separate-devices" ? "BJUD IN" : "LÄGG TILL KONTO"}
                </p>
                <div className="flex flex-col gap-1.5">
                  {invitableProfiles.map((p) => (
                    <button
                      key={p.userId}
                      type="button"
                      disabled={addingAccountId === p.userId}
                      onClick={() => handleSelectAccount(p)}
                      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-paper disabled:opacity-60"
                    >
                      <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 text-[10px] font-bold text-paper-dim">
                        {p.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          avatarInitials(p.username)
                        )}
                      </div>
                      <span className="flex-1">{p.username}</span>
                      <span className="text-xs text-gold-bright">
                        {mode === "separate-devices" ? "Bjud in" : "Lägg till"}
                      </span>
                    </button>
                  ))}
                </div>
                {accountError && <p className="mt-1.5 text-xs text-red-400">{accountError}</p>}
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => newAvatarInputRef.current?.click()}
                disabled={addingPlayer}
                className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed border-gold/30 bg-white/5 text-[10px] text-paper-dim disabled:opacity-60"
              >
                {newAvatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={newAvatarPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  "＋"
                )}
              </button>
              <input
                ref={newAvatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleNewAvatarChange}
                className="hidden"
              />
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ny spelare"
                disabled={addingPlayer}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-paper placeholder:text-muted-dim disabled:opacity-60"
                onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
              />
              <button
                type="button"
                onClick={handleAddPlayer}
                disabled={addingPlayer}
                className="shrink-0 rounded-xl border border-gold/25 bg-white/5 px-4 py-2 font-semibold text-gold-bright disabled:opacity-60"
              >
                Lägg till
              </button>
            </div>
            {avatarError && <p className="mt-1 text-xs text-red-400">{avatarError}</p>}

            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="mt-3 w-full rounded-xl bg-white/5 py-2 text-sm font-semibold text-paper-dim"
            >
              Klar
            </button>
          </div>
        )}
      </div>

      {startError && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {startError}
        </p>
      )}

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
