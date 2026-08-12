"use client";

import { FREE_ROLLS_PER_TURN } from "@/lib/domain/turn";

interface RollControlsProps {
  rollsUsedThisTurn: number;
  pool: number;
  canRoll: boolean;
  onRoll: () => void;
}

export function RollControls({
  rollsUsedThisTurn,
  pool,
  canRoll,
  onRoll,
}: RollControlsProps) {
  const usingBorrow = rollsUsedThisTurn >= FREE_ROLLS_PER_TURN;
  const rollsLeft = Math.max(0, FREE_ROLLS_PER_TURN - rollsUsedThisTurn);

  return (
    <div className="flex w-full flex-col items-center gap-1.5">
      <p className="text-center text-[8.5px] leading-tight text-paper-dim">
        {rollsUsedThisTurn === 0
          ? "Tryck för att låsa"
          : usingBorrow
            ? "Sparar från potten"
            : `${rollsLeft} kast kvar`}
      </p>
      <button
        type="button"
        onClick={onRoll}
        disabled={!canRoll}
        className="flex w-full flex-col items-center gap-0.5 rounded-xl px-1.5 py-2 text-[10px] font-extrabold tracking-[.04em] text-[var(--color-ink)] shadow-[0_10px_20px_rgba(0,0,0,.4),inset_0_2px_0_rgba(255,255,255,.45)] transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: canRoll
            ? "var(--color-accent-grad)"
            : "linear-gradient(150deg,#8a8577,#5f5a4f)",
        }}
      >
        <span className="text-sm leading-none">↻</span>
        {rollsUsedThisTurn === 0 ? "KASTA" : usingBorrow ? "SPARAT KAST" : "KASTA IGEN"}
      </button>
      <div className="flex items-center gap-1.5 text-sm">
        <span className="font-semibold text-sage">
          {Math.min(rollsUsedThisTurn, FREE_ROLLS_PER_TURN)}/{FREE_ROLLS_PER_TURN}
        </span>
        <span className="whitespace-nowrap rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 font-bold text-gold-bright">
          {pool}
        </span>
      </div>
    </div>
  );
}
