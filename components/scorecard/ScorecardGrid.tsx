"use client";

import { useState, type ReactNode } from "react";
import { CATEGORY_LABELS, scoreCategory } from "@/lib/domain/categories";
import { totalScore, upperBonus, upperSum } from "@/lib/domain/scoring";
import {
  LOWER_CATEGORY_IDS,
  UPPER_BONUS_THRESHOLD,
  UPPER_CATEGORY_IDS,
} from "@/lib/domain/types";
import type { CategoryId, Dice, MatchPlayer, Player } from "@/lib/domain/types";
import type { Profile } from "@/lib/supabase/profiles";

interface ScorecardGridProps {
  matchPlayers: MatchPlayer[];
  players: Record<string, Player>;
  profiles?: Record<string, Profile>;
  playerOrder: string[];
  activePlayerId: string;
  previewDice?: Dice;
  canScoreActivePlayer: boolean;
  onScore?: (categoryId: CategoryId) => void;
}

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

const LABEL_BG = "#0a1712";

function Row({ label, cells }: { label: ReactNode; cells: ReactNode[] }) {
  return (
    <>
      <div className="sticky left-0 z-10" style={{ background: LABEL_BG }}>
        {label}
      </div>
      {cells}
    </>
  );
}

export function ScorecardGrid({
  matchPlayers,
  players,
  profiles,
  playerOrder,
  activePlayerId,
  previewDice,
  canScoreActivePlayer,
  onScore,
}: ScorecardGridProps) {
  const mpByPlayer = new Map(matchPlayers.map((mp) => [mp.playerId, mp]));
  const orderedPlayerIds = playerOrder.filter((id) => mpByPlayer.has(id));
  const LABEL_WIDTH = 100;
  const COLUMN_WIDTH = 50;
  const gridTemplateColumns = `${LABEL_WIDTH}px repeat(${orderedPlayerIds.length}, minmax(${COLUMN_WIDTH}px, 1fr))`;

  // Scoring a category takes two taps — the first just arms the cell, the
  // second (on that same cell) actually locks it in — so a stray tap on the
  // scorecard can't silently burn a category. A new roll changes what every
  // preview score would be, so it clears whatever was armed.
  const [armedCategoryId, setArmedCategoryId] = useState<CategoryId | null>(null);
  const [trackedPreviewDice, setTrackedPreviewDice] = useState(previewDice);
  if (previewDice !== trackedPreviewDice) {
    setTrackedPreviewDice(previewDice);
    setArmedCategoryId(null);
  }

  function categoryCell(categoryId: CategoryId, playerId: string) {
    const mp = mpByPlayer.get(playerId)!;
    const isActiveCol = playerId === activePlayerId;
    const filled = mp.scores[categoryId];
    const clickable =
      isActiveCol && canScoreActivePlayer && filled === undefined && previewDice !== undefined;
    const armed = clickable && armedCategoryId === categoryId;
    const preview = isActiveCol && previewDice ? scoreCategory(categoryId, previewDice) : undefined;
    const text = filled !== undefined ? filled : clickable ? preview : "·";

    function handleClick() {
      if (!clickable) return;
      if (armed) {
        setArmedCategoryId(null);
        onScore?.(categoryId);
      } else {
        setArmedCategoryId(categoryId);
      }
    }

    return (
      <button
        key={playerId}
        type="button"
        disabled={!clickable}
        onClick={handleClick}
        aria-label={armed ? `${CATEGORY_LABELS[categoryId]}: tryck igen för att låsa` : undefined}
        className={`border-b border-white/5 px-1 py-1 text-center text-[13px] tabular-nums transition-colors ${
          armed
            ? "bg-gold/45 ring-2 ring-inset ring-gold-bright"
            : isActiveCol
              ? "bg-gold/10"
              : ""
        } ${
          clickable
            ? "cursor-pointer hover:bg-gold/10"
            : filled !== undefined
              ? "font-semibold text-paper"
              : "cursor-default text-[#5d6b62]"
        }`}
      >
        {clickable ? (
          // The label: a little tag marking "this is what you'd score here",
          // colored to signal outcome at a glance — gold for points, a dull
          // red for a category that would score zero right now.
          <span
            className={`inline-flex min-w-[1.9em] items-center justify-center rounded-md px-1.5 py-0.5 text-[12px] font-extrabold shadow-[0_1px_2px_rgba(0,0,0,.35)] ${
              (preview ?? 0) > 0
                ? "bg-gradient-to-br from-[#eecb7c] to-[#b98d38] text-[#241708]"
                : "bg-[#5c2a2a] text-[#e8b9b9]"
            }`}
          >
            {text}
          </span>
        ) : (
          text
        )}
      </button>
    );
  }

  function numberCell(playerId: string, value: number, opts?: { gold?: boolean; total?: boolean }) {
    const isActiveCol = playerId === activePlayerId;
    const text = opts?.gold ? (value > 0 ? `+${value}` : "·") : value;
    return (
      <div
        key={playerId}
        className={`px-1 py-1 text-center tabular-nums ${isActiveCol ? "bg-gold/10" : ""} ${
          opts?.total
            ? "font-serif text-[15px] font-bold text-gold-bright"
            : opts?.gold
              ? "text-[11px] font-bold text-gold-bright"
              : "text-[13px] font-semibold text-paper-dim"
        }`}
      >
        {text}
      </div>
    );
  }

  return (
    <div
      className="w-full overflow-x-auto rounded-2xl border border-gold/15 p-1.5"
      style={{ background: LABEL_BG }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns,
          minWidth: orderedPlayerIds.length * COLUMN_WIDTH + LABEL_WIDTH,
        }}
      >
        {/* header */}
        <div className="sticky left-0 z-10" style={{ background: LABEL_BG }} />
        {orderedPlayerIds.map((id) => {
          const isActive = id === activePlayerId;
          const linkedUserId = players[id]?.linkedUserId;
          const avatarUrl =
            (linkedUserId ? profiles?.[linkedUserId]?.avatarUrl : undefined) ??
            players[id]?.avatarUrl ??
            undefined;
          return (
            <div
              key={id}
              className="flex flex-col items-center gap-0.5 border-b border-gold/25 px-0.5 pb-1"
            >
              <div
                className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded-full text-[9px] font-extrabold ${
                  isActive
                    ? "bg-gradient-to-br from-[#e9c877] to-[#b58a37] text-[#241a08]"
                    : "border border-white/15 bg-white/10 text-paper-dim"
                }`}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(players[id]?.name ?? "?")
                )}
              </div>
              <span
                className={`max-w-full truncate text-[9px] font-semibold ${
                  isActive ? "text-gold-bright" : "text-paper-dim"
                }`}
              >
                {players[id]?.name ?? "?"}
              </span>
            </div>
          );
        })}

        <Row
          label={
            <div className="px-2 py-0.5 text-[9px] font-extrabold tracking-[.2em] text-sage">
              ÖVRE
            </div>
          }
          cells={orderedPlayerIds.map((id) => (
            <div key={id} />
          ))}
        />
        {UPPER_CATEGORY_IDS.map((id) => (
          <Row
            key={id}
            label={
              <div className="px-2 py-1 text-[13px] text-paper-dim">{CATEGORY_LABELS[id]}</div>
            }
            cells={orderedPlayerIds.map((playerId) => categoryCell(id, playerId))}
          />
        ))}

        <Row
          label={
            <div className="px-2 py-1 text-[11px] font-medium text-paper-dim">Summa övre</div>
          }
          cells={orderedPlayerIds.map((id) =>
            numberCell(id, upperSum(mpByPlayer.get(id)!.scores)),
          )}
        />
        <Row
          label={
            <div className="px-2 py-1 text-[10px] font-semibold text-gold-bright">
              Bonus ({UPPER_BONUS_THRESHOLD})
            </div>
          }
          cells={orderedPlayerIds.map((id) =>
            numberCell(id, upperBonus(mpByPlayer.get(id)!.scores), { gold: true }),
          )}
        />

        <Row
          label={
            <div className="px-2 py-0.5 text-[9px] font-extrabold tracking-[.2em] text-sage">
              NEDRE
            </div>
          }
          cells={orderedPlayerIds.map((id) => (
            <div key={id} />
          ))}
        />
        {LOWER_CATEGORY_IDS.map((id) => (
          <Row
            key={id}
            label={
              <div className="px-2 py-1 text-[13px] text-paper-dim">{CATEGORY_LABELS[id]}</div>
            }
            cells={orderedPlayerIds.map((playerId) => categoryCell(id, playerId))}
          />
        ))}

        <Row
          label={
            <div className="px-2 py-1 font-serif text-[15px] font-bold text-gold-bright">
              Totalt
            </div>
          }
          cells={orderedPlayerIds.map((id) =>
            numberCell(id, totalScore(mpByPlayer.get(id)!.scores), { total: true }),
          )}
        />
      </div>
    </div>
  );
}
