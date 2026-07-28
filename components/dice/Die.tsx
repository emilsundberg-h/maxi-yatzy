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

// Each face keeps a fixed value/pip pattern (opposite faces sum to 7, like a
// real die) and never changes. Rolling only rotates the cube itself so a
// different face ends up pointing at the viewer — this is what makes the
// mid-roll tumble show real face transitions instead of an instant swap.
const FACES: { value: DieValue; transform: (half: number) => string; shade: number }[] = [
  { value: 1, transform: (h) => `translateZ(${h}px)`, shade: 1 },
  { value: 6, transform: (h) => `rotateY(180deg) translateZ(${h}px)`, shade: 0.86 },
  { value: 2, transform: (h) => `rotateY(90deg) translateZ(${h}px)`, shade: 0.94 },
  { value: 5, transform: (h) => `rotateY(-90deg) translateZ(${h}px)`, shade: 0.94 },
  { value: 3, transform: (h) => `rotateX(90deg) translateZ(${h}px)`, shade: 1.05 },
  { value: 4, transform: (h) => `rotateX(-90deg) translateZ(${h}px)`, shade: 0.9 },
];

// Cube rotation (deg) that brings each value's face to point at the viewer,
// derived from the face transforms above (global rotation that cancels the
// face's own local rotation).
const SETTLE: Record<DieValue, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
};

// Smallest forward (never backward) rotation from `current` that lands on
// `target` modulo 360 — keeps every roll spinning further in the same
// direction instead of ever snapping back.
function wrapForward(current: number, target: number): number {
  const remainder = (((target - current) % 360) + 360) % 360;
  return current + remainder;
}

function randomSpins(): number {
  return 2 + Math.floor(Math.random() * 2);
}

export const ROLL_MIN_DURATION_S = 0.65;
export const ROLL_MAX_DURATION_S = 0.95;

function randomDuration(): number {
  return ROLL_MIN_DURATION_S + Math.random() * (ROLL_MAX_DURATION_S - ROLL_MIN_DURATION_S);
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
  const [rotX, setRotX] = useState(() => SETTLE[value].x);
  const [rotY, setRotY] = useState(() => SETTLE[value].y);
  const [spinning, setSpinning] = useState(false);
  const [duration, setDuration] = useState(0.7);
  const [trackedRolls, setTrackedRolls] = useState(rollsUsedThisTurn);
  const [trackedLocked, setTrackedLocked] = useState(locked);

  if (rollsUsedThisTurn !== trackedRolls) {
    setTrackedRolls(rollsUsedThisTurn);
    if (!locked) {
      const target = SETTLE[value];
      setRotX(wrapForward(rotX, target.x) + randomSpins() * 360);
      setRotY(wrapForward(rotY, target.y) + randomSpins() * 360);
      setDuration(randomDuration());
      setSpinning(true);
    }
  }

  // Dice always settle dead-on (no idle 3D tilt), same as a locked die — a
  // snap, not a roll, so no spin animation on lock/unlock.
  if (locked !== trackedLocked) {
    setTrackedLocked(locked);
    const target = SETTLE[value];
    setRotX(target.x);
    setRotY(target.y);
    setDuration(0);
  }

  useEffect(() => {
    if (!spinning) return;
    const timeout = setTimeout(() => setSpinning(false), duration * 1000);
    return () => clearTimeout(timeout);
  }, [spinning, duration]);

  const half = size / 2;
  // Locked dice sit flush (like they've been pressed down and left); unlocked
  // interactive dice float with a bigger, softer shadow so it's visually
  // obvious they can still be picked up and tapped. The lock ring itself
  // isn't drawn here — see the face loop below for why.
  const boxShadow = locked
    ? "0 4px 10px rgba(0,0,0,.4)"
    : interactive
      ? "0 16px 24px rgba(0,0,0,.45), 0 4px 6px rgba(0,0,0,.25)"
      : "0 8px 14px rgba(0,0,0,.35)";
  const restY = locked ? 0 : interactive ? -size * 0.08 : 0;

  // Faces are rendered slightly larger than the nominal cube size and pulled
  // back in with a negative inset, so adjacent rounded corners overlap
  // instead of leaving a gap at the seam where two faces meet.
  const overlap = size * 0.05;
  const radius = size * 0.12;

  return (
    <motion.button
      type="button"
      onClick={onToggleLock}
      disabled={!interactive}
      aria-pressed={locked}
      aria-label={`Tärning visar ${value}${locked ? ", låst" : ""}`}
      whileHover={interactive ? { scale: 1.06 } : undefined}
      whileTap={interactive ? { scale: 0.93 } : undefined}
      animate={{
        y: spinning ? [0, -size * 0.3, size * 0.04, restY] : restY,
        scale: spinning ? [1, 1.05, 0.97, 1] : 1,
      }}
      transition={{ duration, ease: "easeOut" }}
      style={{
        width: size,
        height: size,
        perspective: size * 7,
        boxShadow,
        borderRadius: radius,
        background: "transparent",
        border: "none",
        padding: 0,
      }}
      className={`shrink-0 ${interactive ? "cursor-pointer" : "cursor-default opacity-95"}`}
    >
      <motion.div
        animate={{ rotateX: rotX, rotateY: rotY }}
        transition={{
          rotateX: { duration, ease: [0.22, 0.61, 0.36, 1] },
          rotateY: { duration, ease: [0.22, 0.61, 0.36, 1] },
        }}
        style={{
          width: size,
          height: size,
          position: "relative",
          transformStyle: "preserve-3d",
        }}
      >
        {FACES.map((face) => {
          const on = new Set(PIP_MAPS[face.value]);
          // The lock ring is drawn on the settled face itself, not the flat
          // outer button — perspective + translateZ magnifies the face by a
          // fixed ratio (independent of `size`, but not identical across
          // browser engines), so a ring sized on the button can't reliably
          // hug it: too tight and the face paints over it, too loose and a
          // gap opens at the rounded corners. Attached to the face, the ring
          // is magnified right along with it and always lines up exactly.
          const lockRing =
            locked && face.value === value
              ? `, 0 0 0 ${size * 0.03}px rgba(20,15,5,.6), 0 0 0 ${size * 0.08}px ${GOLD}, 0 0 ${size * 0.3}px ${GOLD}cc`
              : "";
          return (
            <div
              key={face.value}
              style={{
                position: "absolute",
                inset: -overlap,
                transform: face.transform(half),
                backfaceVisibility: "hidden",
                borderRadius: radius,
                background: `linear-gradient(150deg, rgba(250,245,234,${face.shade}) 0%, rgba(236,226,205,${face.shade}) 60%, rgba(221,208,180,${face.shade}) 100%)`,
                boxShadow: `inset 0 1.5px 0 rgba(255,255,255,.7), inset 0 -2px 3px rgba(120,100,60,.2)${lockRing}`,
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gridTemplateRows: "repeat(3,1fr)",
                gap: size * 0.06,
                padding: size * 0.15 + overlap,
                boxSizing: "border-box",
              }}
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
            </div>
          );
        })}
      </motion.div>
    </motion.button>
  );
}
