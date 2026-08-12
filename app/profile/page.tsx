"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { downscaleImage } from "@/lib/downscaleImage";
import {
  disablePush,
  enablePush,
  getPermission,
  isPushSupported,
  isStandalone,
  isSubscribed,
  type PushPermission,
} from "@/lib/push";
import { getProfile, updateUsername, type Profile } from "@/lib/supabase/profiles";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { usePlayersStore } from "@/lib/store/usePlayersStore";
import { useThemeStore } from "@/lib/store/useThemeStore";
import { THEME_IDS, THEMES } from "@/lib/theme/themes";

function initials(text: string): string {
  return text.trim().slice(0, 2).toUpperCase() || "?";
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { players, load: loadPlayers, renamePlayer } = usePlayersStore();
  const { theme, setTheme } = useThemeStore();
  const [profile, setProfile] = useState<Profile | undefined>();
  const [username, setUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pushPermission, setPushPermission] = useState<PushPermission>(() => getPermission());
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  // Starts false to match the server render (no `window`), then flips
  // client-side post-mount — calling isPushSupported() directly in JSX
  // would return a different value during SSR vs. hydration and trigger
  // a hydration-mismatch error on every load.
  const [pushSupported, setPushSupported] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPushSupported(isPushSupported());
  }, []);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then((p) => {
      setProfile(p);
      setUsername(p?.username ?? "");
    });
  }, [user]);

  useEffect(() => {
    isSubscribed().then(setPushSubscribed);
  }, []);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  async function handleSaveUsername() {
    if (!user) return;
    const trimmed = username.trim();
    if (!trimmed) return;
    setSavingUsername(true);
    setUsernameError(null);
    try {
      await updateUsername(user.id, trimmed);
      setProfile((p) => (p ? { ...p, username: trimmed } : p));
      // The name shown in matches/scorecards comes from the player's own
      // `players` row (linked to this account), not `profiles.username` —
      // keep it in sync so the new name actually shows up in-game.
      const selfPlayer = players.find((p) => p.linkedUserId === user.id);
      if (selfPlayer && selfPlayer.name !== trimmed) {
        await renamePlayer(selfPlayer.id, trimmed);
      }
    } catch (err) {
      setUsernameError(
        err instanceof Error && err.message.includes("duplicate")
          ? "Det användarnamnet är upptaget."
          : "Kunde inte spara användarnamnet.",
      );
    } finally {
      setSavingUsername(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      const blob = await downscaleImage(file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Uppladdning misslyckades.");
      setProfile((p) => (p ? { ...p, avatarUrl: data.avatarUrl } : p));
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Uppladdning misslyckades.");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleTogglePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      if (pushSubscribed) {
        await disablePush();
        setPushSubscribed(false);
      } else {
        const result = await enablePush();
        setPushPermission(result);
        setPushSubscribed(result === "granted");
        if (result === "denied") {
          setPushError("Notiser blockerade — tillåt dem i telefonens inställningar.");
        }
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Något gick fel.");
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-extrabold tracking-[.28em] text-gold">
            MAXI YATZY
          </div>
          <h1 className="font-serif text-3xl font-semibold text-paper">Min profil</h1>
        </div>
        <Link href="/players" className="text-sm text-paper-dim hover:text-gold-bright">
          Till spelare
        </Link>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-gold/30 bg-surface text-2xl font-extrabold text-paper-dim disabled:opacity-60"
        >
          {profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(profile?.username || user?.email || "?")
          )}
          {uploadingAvatar && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white">
              ...
            </span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-gold-bright hover:underline"
        >
          Byt bild
        </button>
        {avatarError && <p className="text-xs text-red-400">{avatarError}</p>}
      </div>

      <div>
        <p className="mb-2 text-[10px] font-extrabold tracking-[.2em] text-sage">
          ANVÄNDARNAMN
        </p>
        <div className="flex gap-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ditt användarnamn"
            className="flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-paper placeholder:text-muted-dim"
          />
          <button
            type="button"
            onClick={handleSaveUsername}
            disabled={savingUsername || !username.trim()}
            className="rounded-xl border border-gold/25 bg-surface px-4 py-2 font-semibold text-gold-bright disabled:opacity-60"
          >
            Spara
          </button>
        </div>
        {usernameError && <p className="mt-1 text-xs text-red-400">{usernameError}</p>}
        <p className="mt-1 text-xs text-muted">Andra kan hitta och bjuda in dig via det här namnet.</p>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-extrabold tracking-[.2em] text-sage">FÄRGTEMA</p>
        <div className="flex flex-wrap gap-2">
          {THEME_IDS.map((id) => {
            const active = id === theme;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-gold bg-gold/15 text-paper"
                    : "border-line bg-surface text-paper-dim"
                }`}
              >
                <span
                  className="h-5 w-5 rounded-full border border-black/10"
                  style={{ background: THEMES[id].dot }}
                />
                {THEMES[id].name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="mb-1 text-[10px] font-extrabold tracking-[.2em] text-sage">NOTISER</p>
        {!pushSupported ? (
          <p className="text-sm text-muted">Push-notiser stöds inte i den här webbläsaren.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-paper-dim">
              Få en notis på telefonen när du blir inbjuden att spela.
              {!isStandalone() && (
                <> På iPhone/iPad måste appen vara installerad på hemskärmen för att notiser ska fungera.</>
              )}
            </p>
            <button
              type="button"
              onClick={handleTogglePush}
              disabled={pushBusy || pushPermission === "denied"}
              className="w-full rounded-xl px-4 py-2.5 font-semibold text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: pushSubscribed
                  ? "rgba(255,255,255,.08)"
                  : "var(--color-accent-grad)",
                color: pushSubscribed ? "var(--color-paper)" : "var(--color-ink)",
              }}
            >
              {pushSubscribed ? "Stäng av notiser" : "Slå på notiser"}
            </button>
            {pushPermission === "denied" && (
              <p className="mt-2 text-xs text-red-400">
                Blockerat i webbläsaren — ändra i telefonens inställningar.
              </p>
            )}
            {pushError && <p className="mt-2 text-xs text-red-400">{pushError}</p>}
          </>
        )}
      </div>
    </div>
  );
}
