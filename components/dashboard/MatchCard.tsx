import Link from "next/link";
import { totalScore } from "@/lib/domain/scoring";
import type { Match, MatchPlayer, Player } from "@/lib/domain/types";
import type { Profile } from "@/lib/supabase/profiles";

interface MatchCardProps {
  match: Match;
  matchPlayers: MatchPlayer[];
  players: Record<string, Player>;
  profiles?: Record<string, Profile>;
  localPlayerId?: string;
}

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

export function MatchCard({ match, matchPlayers, players, profiles, localPlayerId }: MatchCardProps) {
  const leader = [...matchPlayers].sort(
    (a, b) => totalScore(b.scores) - totalScore(a.scores),
  )[0];
  const isCompleted = match.status === "completed";
  const activePlayerId = match.playerIds[match.currentPlayerIndex];
  const isYourTurn =
    !isCompleted &&
    (match.mode === "shared-device" || activePlayerId === localPlayerId);
  const progress = Math.min(1, (match.currentTurnNumber - 1) / 20);

  return (
    <Link
      href={`/match/${match.id}`}
      className="relative block overflow-hidden rounded-[18px] border p-4 pl-5 transition-colors"
      style={{
        borderColor: isCompleted
          ? "rgba(255,255,255,.07)"
          : isYourTurn
            ? "rgba(233,200,119,.28)"
            : "rgba(255,255,255,.07)",
        background: isCompleted
          ? "rgba(255,255,255,.02)"
          : isYourTurn
            ? "rgba(233,200,119,.07)"
            : "rgba(255,255,255,.035)",
      }}
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-[4px]"
        style={{ background: isYourTurn ? "#e9c877" : "#5aa88f" }}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="font-serif text-xl text-paper">
          {match.playerIds.map((id) => players[id]?.name ?? "?").join(" · ")}
        </span>
        <span
          className="shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-extrabold tracking-[.14em]"
          style={{
            borderColor: match.mode === "shared-device" ? "rgba(90,168,143,.4)" : "rgba(233,200,119,.4)",
            color: match.mode === "shared-device" ? "#8bbfae" : "#cbb984",
          }}
        >
          {match.mode === "shared-device" ? "SAMMA ENHET" : "EGNA ENHETER"}
        </span>
      </div>

      <div className="mt-2 flex items-center -space-x-1.5">
        {match.playerIds.slice(0, 5).map((id) => {
          const linkedUserId = players[id]?.linkedUserId;
          const avatarUrl =
            (linkedUserId ? profiles?.[linkedUserId]?.avatarUrl : undefined) ??
            players[id]?.avatarUrl ??
            undefined;
          return (
            <div
              key={id}
              className="flex h-[26px] w-[26px] items-center justify-center overflow-hidden rounded-full border-2 text-[10px] font-bold text-paper-dim"
              style={{ background: "#3a3a40", borderColor: "#17171b" }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(players[id]?.name ?? "?")
              )}
            </div>
          );
        })}
        {match.playerIds.length > 5 && (
          <div
            className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 text-[9px] font-bold text-muted"
            style={{ background: "#2a2a2f", borderColor: "#17171b" }}
          >
            +{match.playerIds.length - 5}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        {isCompleted ? (
          <span className="flex items-center gap-1.5 text-muted">
            <span className="text-gold-bright">♛</span>
            {leader && players[leader.playerId]
              ? `${players[leader.playerId].name} vann · ${totalScore(leader.scores)}p`
              : "Avslutad"}
          </span>
        ) : (
          <span
            className="flex items-center gap-1.5 font-semibold"
            style={{ color: isYourTurn ? "#e9c877" : "#a49d8e" }}
          >
            <span
              className="h-[7px] w-[7px] rounded-full"
              style={{
                background: isYourTurn ? "#e9c877" : "#6f6a5e",
                boxShadow: isYourTurn ? "0 0 8px #e9c877" : "none",
              }}
            />
            {isYourTurn ? "Din tur" : `${players[activePlayerId]?.name ?? "?"} slår nu`}
          </span>
        )}
        <span className="tabular-nums text-muted">Runda {match.currentTurnNumber}/20</span>
      </div>
      {!isCompleted && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full"
            style={{
              width: `${progress * 100}%`,
              background: isYourTurn
                ? "linear-gradient(90deg,#e9c877,#b58a37)"
                : "#5aa88f",
            }}
          />
        </div>
      )}
    </Link>
  );
}
