"use client";

import { useEffect, useState, type ReactNode } from "react";
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

const LABEL_BG = "var(--color-panel)";
// How long an armed (first-tapped) cell waits for the confirming second tap
// before quietly disarming itself again — a stray arm from earlier in the
// turn shouldn't stay primed to lock in a category on the next unrelated
// tap.
const ARM_TIMEOUT_MS = 2600;

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

  function avatarUrl(id: string): string | undefined {
    const linkedUserId = players[id]?.linkedUserId;
    return (
      (linkedUserId ? profiles?.[linkedUserId]?.avatarUrl : undefined) ??
      players[id]?.avatarUrl ??
      undefined
    );
  }

  // Tapping a header avatar shows it full-size — the header itself only has
  // room for a 24px circle, too small to actually recognize anyone by.
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

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

  useEffect(() => {
    if (armedCategoryId === null) return;
    const timer = setTimeout(() => setArmedCategoryId(null), ARM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [armedCategoryId]);

  function categoryCell(categoryId: CategoryId, playerId: string) {
    const mp = mpByPlayer.get(playerId)!;
    const isActiveCol = playerId === activePlayerId;
    const filled = mp.scores[categoryId];
    const clickable =
      isActiveCol && canScoreActivePlayer && filled === undefined && previewDice !== undefined;
    const armed = clickable && armedCategoryId === categoryId;
    const preview = isActiveCol && previewDice ? scoreCategory(categoryId, previewDice) : undefined;
    const text = filled !== undefined ? filled : clickable ? preview : "·";
    const positive = (preview ?? 0) > 0;

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
        className={`relative border-b border-line px-1 py-1 text-center text-[13px] tabular-nums transition-colors ${
          // No background wash on the cell itself, clickable or not — the
          // design's cells are always plain (fully transparent, no matter
          // whose column or locked/unlocked) and let the pill or the plain
          // locked number be the only colored thing on the row. A tint on
          // some cells and not others read as two different visual systems
          // (boxed rows vs. free-floating labels) instead of one.
          clickable
            ? "cursor-pointer"
            : filled !== undefined
              ? "font-bold text-paper"
              : "cursor-default text-muted-dim"
        }`}
      >
        {clickable ? (
          <>
            {armed && (
              // Arming a cell used to only grow the tag itself — easy to
              // miss that a second tap is required. A floating "press
              // again" callout above the cell makes the two-tap gesture
              // obvious instead of implicit. pointer-events-none so it
              // never steals the confirming tap from the button beneath it.
              <span
                className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white shadow-[0_4px_8px_rgba(0,0,0,.35)]"
                style={{ background: "color-mix(in srgb, var(--color-gold) 35%, black)" }}
              >
                TRYCK IGEN
              </span>
            )}
            {/* The whole hit target should read as one label, not a tag
                floating inside a separate box — so this pill is padded to
                fill most of the cell itself, with nothing else behind it.
                Sized to the design's own min-width (34px). Colored to
                signal outcome at a glance — flat gold for points, a dull
                flat red for a category that would score zero right now
                (matches the design's flat colors, not the app's usual gold
                gradient). No border at rest — arming adds one in the same
                tone as the pill's own fill (a lighter gold on a gold pill, a
                lighter red on a red one), never a foreign white/cream ring
                that clashes against the red pills. */}
            <span
              className={`inline-flex min-w-[34px] items-center justify-center rounded-[10px] border-2 border-transparent px-2.5 py-1 text-[12px] leading-none font-bold shadow-[0_1px_2px_rgba(0,0,0,.35)] transition-all duration-150 ${
                armed
                  ? positive
                    ? "scale-[1.32] border-gold-bright shadow-[0_0_0_5px_color-mix(in_srgb,var(--color-gold)_50%,transparent)] brightness-110"
                    : "scale-[1.32] border-[#8a4a4a] shadow-[0_0_0_5px_rgba(139,74,74,.6)] brightness-110"
                  : "scale-100"
              } ${positive ? "bg-gold text-[var(--color-ink)]" : "bg-[#5b3838] text-[#d9b7b7]"}`}
            >
              {text}
            </span>
          </>
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

  const expandedPlayer = expandedPlayerId ? players[expandedPlayerId] : undefined;
  const expandedAvatarUrl = expandedPlayerId ? avatarUrl(expandedPlayerId) : undefined;

  return (
    <>
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
            const url = avatarUrl(id);
            return (
              <div
                key={id}
                className="flex flex-col items-center gap-0.5 border-b border-gold/25 px-0.5 pb-1"
              >
                <button
                  type="button"
                  onClick={() => setExpandedPlayerId(id)}
                  aria-label={`Visa ${players[id]?.name ?? "spelaren"}s bild`}
                  className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded-full text-[9px] font-extrabold ${
                    isActive
                      ? "bg-gradient-to-br from-gold-bright to-gold-deep text-[var(--color-ink)]"
                      : "border border-line bg-surface text-paper-dim"
                  }`}
                >
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(players[id]?.name ?? "?")
                  )}
                </button>
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

      {expandedPlayerId && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6"
          onClick={() => setExpandedPlayerId(null)}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="flex h-56 w-56 max-w-[70vw] items-center justify-center overflow-hidden rounded-full border-4 border-gold/40 text-6xl font-extrabold text-paper-dim shadow-[0_20px_50px_rgba(0,0,0,.5)]"
              style={{ background: "var(--color-panel)", aspectRatio: "1 / 1" }}
            >
              {expandedAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={expandedAvatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(expandedPlayer?.name ?? "?")
              )}
            </div>
            <span className="font-serif text-xl font-semibold text-paper">
              {expandedPlayer?.name ?? "?"}
            </span>
            <button
              type="button"
              onClick={() => setExpandedPlayerId(null)}
              className="mt-1 rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-semibold text-paper-dim"
            >
              Stäng
            </button>
          </div>
        </div>
      )}
    </>
  );
}
