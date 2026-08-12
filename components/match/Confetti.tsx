"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

const COLOR_VARS = [
  "--color-gold",
  "--color-gold-bright",
  "--color-paper",
  "--color-sage",
  "--color-felt-bright",
  "--color-gold-deep",
];

// Reads the *current* theme's palette straight off the root element rather
// than hard-coding hex values, so confetti automatically matches whichever
// Färgtema (color theme) is active without a per-theme color table here.
function themeColors(): string[] {
  if (typeof window === "undefined") return ["#c9a959"];
  const style = getComputedStyle(document.documentElement);
  return COLOR_VARS.map((v) => style.getPropertyValue(v).trim() || "#c9a959");
}

interface Piece {
  id: number;
  leftPct: number;
  driftVw: number;
  peakVh: number;
  color: string;
  width: number;
  height: number;
  spin: number;
  delay: number;
  duration: number;
}

function makePieces(count: number, colors: string[]): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    leftPct: Math.random() * 100,
    driftVw: (Math.random() - 0.5) * 30,
    peakVh: 10 + Math.random() * 55,
    color: colors[i % colors.length],
    width: 6 + Math.random() * 6,
    height: 10 + Math.random() * 8,
    spin: (Math.random() - 0.5) * 720,
    delay: Math.random() * 0.6,
    duration: 1.6 + Math.random() * 1,
  }));
}

// Fired once when the match ends — bursts a couple hundred pieces up from
// the bottom edge and lets them tumble back down, covering the screen.
export function Confetti({ count = 160 }: { count?: number }) {
  const pieces = useMemo(() => makePieces(count, themeColors()), [count]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[75] overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: "115vh", x: 0, rotate: 0, opacity: 1 }}
          animate={{
            y: ["115vh", `${p.peakVh}vh`, "115vh"],
            x: [0, `${p.driftVw}vw`, `${p.driftVw}vw`],
            rotate: [0, p.spin * 0.6, p.spin],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            times: [0, 0.45, 1],
            ease: ["easeOut", "easeIn"],
          }}
          style={{
            position: "absolute",
            left: `${p.leftPct}%`,
            width: p.width,
            height: p.height,
            background: p.color,
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}
