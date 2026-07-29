"use client";

import { motion, useAnimation, type PanInfo } from "framer-motion";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { matchWinnerId, totalScore } from "@/lib/domain/scoring";
import type { Match, MatchPlayer, Player } from "@/lib/domain/types";
import { ALL_CATEGORY_IDS } from "@/lib/domain/types";
import type { Profile } from "@/lib/supabase/profiles";

interface MatchCardProps {
  match: Match;
  matchPlayers: MatchPlayer[];
  players: Record<string, Player>;
  profiles?: Record<string, Profile>;
  localPlayerId?: string;
  onSwipeDelete?: () => void;
}

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

// Dragged left past this (px) and released counts as a swipe-to-delete;
// short of that, the card just springs back and a tap still navigates.
const SWIPE_THRESHOLD = -70;

export function MatchCard({
  match,
  matchPlayers,
  players,
  profiles,
  localPlayerId,
  onSwipeDelete,
}: MatchCardProps) {
  const router = useRouter();
  const controls = useAnimation();
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
    (match.mode === "shared-device" || activePlayerId === localPlayerId);
  const progress = Math.min(1, (match.currentTurnNumber - 1) / ALL_CATEGORY_IDS.length);

  function handleDragEnd(_: unknown, info: PanInfo) {
    void controls.start({ x: 0 });
    if (info.offset.x < SWIPE_THRESHOLD) onSwipeDelete?.();
  }

  return (
    <div className="relative overflow-hidden rounded-[18px]">
      {onSwipeDelete && (
        <div className="absolute inset-0 flex items-center justify-end bg-red-600 pr-6">
          <span className="text-sm font-extrabold tracking-[.08em] text-white">TA BORT</span>
        </div>
      )}
      <motion.div
        drag={onSwipeDelete ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: -110, right: 0 }}
        dragElastic={0.06}
        dragMomentum={false}
        animate={controls}
        onDragStart={() => {
          wasDragged.current = true;
        }}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (wasDragged.current) {
            wasDragged.current = false;
            return;
          }
          router.push(`/match/${match.id}`);
        }}
        className="relative block cursor-pointer overflow-hidden rounded-[18px] border p-4 pl-5 transition-colors"
        style={{
          touchAction: "pan-y",
          borderColor: isCompleted
            ? "rgba(255,255,255,.07)"
            : isYourTurn
              ? "rgba(233,200,119,.28)"
              : "rgba(255,255,255,.07)",
          // The card's own tint is translucent by design (it's meant to
          // blend with the page behind it), which let the "TA BORT" panel
          // bleed straight through at rest once that panel sat right
          // behind it. Painting an opaque backing (matching the page's
          // own dark green) underneath the tint keeps the look identical
          // against the page while actually blocking what's behind it —
          // only the sliver the card has been dragged clear of shows red.
          background: `${
            isCompleted
              ? "linear-gradient(rgba(255,255,255,.02),rgba(255,255,255,.02))"
              : isYourTurn
                ? "linear-gradient(rgba(233,200,119,.07),rgba(233,200,119,.07))"
                : "linear-gradient(rgba(255,255,255,.035),rgba(255,255,255,.035))"
          }, #071f16`,
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
          <span className="tabular-nums text-muted">
            Runda {match.currentTurnNumber}/{ALL_CATEGORY_IDS.length}
          </span>
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
      </motion.div>
    </div>
  );
}
