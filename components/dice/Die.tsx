"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { DieValue } from "@/lib/domain/types";

const PIP_MAPS: Record<DieValue, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const GOLD = "#c9a959";
const EDGE_SHADOW =
  "inset 0 1.5px 0 rgba(255,255,255,.85), inset 0 -2px 3px rgba(120,100,60,.25)";

function randomTilt(): number {
  return Math.random() * 20 - 10;
}

interface DieProps {
  value: DieValue;
  locked: boolean;
  rollsUsedThisTurn: number;
  interactive: boolean;
  onToggleLock: () => void;
  size?: number;
}

export function Die({
  value,
  locked,
  rollsUsedThisTurn,
  interactive,
  onToggleLock,
  size = 56,
}: DieProps) {
  const [spinning, setSpinning] = useState(false);
  const [restTilt, setRestTilt] = useState(randomTilt);
  const [trackedRolls, setTrackedRolls] = useState(rollsUsedThisTurn);

  if (rollsUsedThisTurn !== trackedRolls) {
    setTrackedRolls(rollsUsedThisTurn);
    if (!locked) {
      setSpinning(true);
      setRestTilt(randomTilt());
    }
  }

  useEffect(() => {
    if (!spinning) return;
    const timeout = setTimeout(() => setSpinning(false), 700);
    return () => clearTimeout(timeout);
  }, [spinning]);

  const on = new Set(PIP_MAPS[value]);
  const boxShadow = spinning
    ? "0 14px 22px rgba(0,0,0,.5)"
    : locked
      ? `${EDGE_SHADOW}, 0 6px 14px rgba(0,0,0,.45), 0 0 0 2px ${GOLD}, 0 0 18px ${GOLD}66`
      : `${EDGE_SHADOW}, 0 12px 20px rgba(0,0,0,.5)`;

  return (
    <motion.button
      type="button"
      onClick={onToggleLock}
      disabled={!interactive}
      aria-pressed={locked}
      aria-label={`Tärning visar ${value}${locked ? ", låst" : ""}`}
      animate={
        spinning
          ? { rotate: [-18, 184, 342], y: [-3, 3, -3], scale: [0.98, 1.02, 0.98] }
          : { rotate: locked ? 0 : restTilt, y: 0, scale: 1 }
      }
      transition={
        spinning
          ? { duration: 0.7, ease: [0.34, 0.06, 0.5, 1] }
          : { duration: 0.3, ease: "easeOut" }
      }
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        background: "linear-gradient(150deg,#faf5ea 0%,#ece2cd 60%,#ddd0b4 100%)",
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gridTemplateRows: "repeat(3,1fr)",
        gap: size * 0.06,
        padding: size * 0.15,
        boxShadow,
        boxSizing: "border-box",
      }}
      className={`shrink-0 ${interactive ? "cursor-pointer active:brightness-95" : "cursor-default opacity-95"}`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="flex items-center justify-center">
          {on.has(i) && (
            <div
              style={{
                width: size * 0.15,
                height: size * 0.15,
                borderRadius: "50%",
                background: "#241f16",
                boxShadow: "inset 0 -1px 1px rgba(0,0,0,.35)",
              }}
            />
          )}
        </div>
      ))}
    </motion.button>
  );
}
