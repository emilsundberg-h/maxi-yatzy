"use client";

import { Die } from "./Die";
import type { Dice, Locked } from "@/lib/domain/types";

interface DiceColumnProps {
  dice: Dice;
  locked: Locked;
  rollsUsedThisTurn: number;
  interactive: boolean;
  onToggleLock: (index: number) => void;
  size?: number;
}

export function DiceColumn({
  dice,
  locked,
  rollsUsedThisTurn,
  interactive,
  onToggleLock,
  size = 56,
}: DiceColumnProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {dice.map((value, i) => (
        <Die
          key={i}
          value={value}
          locked={locked[i]}
          rollsUsedThisTurn={rollsUsedThisTurn}
          interactive={interactive && rollsUsedThisTurn > 0}
          onToggleLock={() => onToggleLock(i)}
          size={size}
        />
      ))}
    </div>
  );
}
