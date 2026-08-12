"use client";

import { animate, motion, useMotionValue } from "framer-motion";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { playerBelongsToUser } from "@/lib/domain/players";
import { matchWinnerId, totalScore } from "@/lib/domain/scoring";
import type { Match, MatchPlayer, Player } from "@/lib/domain/types";
import { ALL_CATEGORY_IDS } from "@/lib/domain/types";
import type { Profile } from "@/lib/supabase/profiles";

interface MatchCardProps {
  match: Match;
  matchPlayers: MatchPlayer[];
  players: Record<string, Player>;
  profiles?: Record<string, Profile>;
  currentUserId?: string;
  onSwipeDelete?: () => void;
}

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

// Width (px) of the revealed "TA BORT" button — also how far the card can
// be dragged, so a full drag lands exactly on the fully-revealed position.
const REVEAL_WIDTH = 96;

export function MatchCard({
  match,
  matchPlayers,
  players,
  profiles,
  currentUserId,
  onSwipeDelete,
}: MatchCardProps) {
  const router = useRouter();
  const x = useMotionValue(0);
  const [open, setOpen] = useState(false);
  // Drag only ever fires past framer-motion's own movement threshold, so a
  // plain tap never sets this — used to swallow the click a real drag's
  // pointerup would otherwise also fire.
  const wasDragged = useRef(false);

  const winnerId = matchWinnerId(matchPlayers, match.forfeitedByPlayerId);
  const winner = matchPlayers.find((mp) => mp.playerId === winnerId);
  const isCompleted = match.status === "completed";
  const activePlayerId = match.playerIds[match.currentPlayerIndex];
  const isYourTurn =
    !isCompleted &&
    (match.mode === "shared-device" || playerBelongsToUser(players[activePlayerId], currentUserId));
  const progress = Math.min(1, (match.currentTurnNumber - 1) / ALL_CATEGORY_IDS.length);
  const cardTint =
    isYourTurn && !isCompleted
      ? "color-mix(in srgb, var(--color-gold) 10%, var(--color-surface))"
      : "var(--color-surface)";

  // Swiping only ever reveals the "TA BORT" button — it never deletes
  // anything by itself. Snaps to whichever of the two resting positions
  // (closed at 0, open at -REVEAL_WIDTH) the drag ended closer to.
  function snapTo(target: number) {
    animate(x, target, { type: "spring", stiffness: 500, damping: 42 });
    setOpen(target !== 0);
  }

  function handleDragEnd() {
    snapTo(x.get() < -REVEAL_WIDTH / 2 ? -REVEAL_WIDTH : 0);
  }

  function handleCardClick() {
    if (wasDragged.current) {
      wasDragged.current = false;
      return;
    }
    if (open) {
      snapTo(0);
      return;
    }
    router.push(`/match/${match.id}`);
  }

  function handleDeleteClick() {
    snapTo(0);
    onSwipeDelete?.();
  }

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-2xl)]">
      {onSwipeDelete && (
        <button
          type="button"
          onClick={handleDeleteClick}
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-600"
          style={{ width: REVEAL_WIDTH }}
        >
          <span className="text-sm font-extrabold tracking-[.06em] text-white">TA BORT</span>
        </button>
      )}
      <motion.div
        drag={onSwipeDelete ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
        dragElastic={0.06}
        dragMomentum={false}
        onDragStart={() => {
          wasDragged.current = true;
        }}
        onDragEnd={handleDragEnd}
        onClick={handleCardClick}
        className="relative block cursor-pointer overflow-hidden rounded-[var(--radius-2xl)] border p-4 pl-5 transition-colors"
        style={{
          x,
          touchAction: "pan-y",
          borderColor: isYourTurn
            ? "color-mix(in srgb, var(--color-gold) 28%, transparent)"
            : "var(--color-line)",
          // The card's own tint is translucent-by-default (skog), which let
          // the "TA BORT" panel bleed straight through at rest once that
          // panel sat right behind it. Painting an opaque backing (the
          // page's own base color) underneath the tint keeps the look
          // identical against the page while actually blocking what's
          // behind it — only the sliver the card has been dragged clear of
          // shows red. Light themes' surface is already opaque, so the
          // backing layer is a no-op there. The tint itself has to be
          // wrapped in linear-gradient(...) — `background` shorthand only
          // allows a bare color as its *last* comma-separated layer, so two
          // bare colors here is invalid and silently drops the whole
          // declaration, which is exactly what let "TA BORT" show through
          // at rest instead of only once dragged clear.
          background: `linear-gradient(${cardTint}, ${cardTint}), var(--color-felt-deep)`,
        }}
      >
        <span
          className="absolute left-0 top-0 bottom-0 w-[4px]"
          style={{ background: isYourTurn ? "var(--color-gold-bright)" : "var(--color-sage)" }}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="font-serif text-xl text-paper">
            {match.playerIds.map((id) => players[id]?.name ?? "?").join(" · ")}
          </span>
          <span
            className="shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-extrabold tracking-[.14em]"
            style={{
              borderColor:
                match.mode === "shared-device"
                  ? "rgba(90,168,143,.4)"
                  : "color-mix(in srgb, var(--color-gold) 40%, transparent)",
              color: match.mode === "shared-device" ? "#8bbfae" : "var(--color-gold)",
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
                className="flex h-[26px] w-[26px] items-center justify-center overflow-hidden rounded-full border-2 bg-surface text-[10px] font-bold text-paper-dim"
                style={{ borderColor: "var(--color-line)" }}
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
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 bg-surface text-[9px] font-bold text-muted"
              style={{ borderColor: "var(--color-line)" }}
            >
              +{match.playerIds.length - 5}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          {isCompleted ? (
            <span className="flex items-center gap-1.5 text-muted">
              <span className="text-gold-bright">♛</span>
              {winner && players[winner.playerId]
                ? `${players[winner.playerId].name} vann · ${totalScore(winner.scores)}p`
                : "Avslutad"}
              {match.forfeitedByPlayerId && (
                <span className="text-[10px] text-muted-dim">
                  ({players[match.forfeitedByPlayerId]?.name ?? "?"} gav upp)
                </span>
              )}
            </span>
          ) : (
            <span
              className="flex items-center gap-1.5 font-semibold"
              style={{ color: isYourTurn ? "var(--color-gold-bright)" : "var(--color-muted)" }}
            >
              <span
                className="h-[7px] w-[7px] rounded-full"
                style={{
                  background: isYourTurn ? "var(--color-gold-bright)" : "var(--color-muted-dim)",
                  boxShadow: isYourTurn ? "0 0 8px var(--color-gold-bright)" : "none",
                }}
              />
              {isYourTurn ? "Din tur" : `${players[activePlayerId]?.name ?? "?"} slår nu`}
            </span>
          )}
          <span className="tabular-nums text-muted">
            Runda {match.currentTurnNumber}/{ALL_CATEGORY_IDS.length}
          </span>
        </div>
        {!isCompleted && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full"
              style={{
                width: `${progress * 100}%`,
                background: isYourTurn ? "var(--color-accent-grad)" : "var(--color-sage)",
              }}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
