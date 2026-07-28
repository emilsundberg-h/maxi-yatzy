"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

const COLORS = ["#c9a959", "#e9c877", "#f4efe3", "#7e9082", "#1c5d45", "#b58a37"];

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

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    leftPct: Math.random() * 100,
    driftVw: (Math.random() - 0.5) * 30,
    peakVh: 10 + Math.random() * 55,
    color: COLORS[i % COLORS.length],
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
  const pieces = useMemo(() => makePieces(count), [count]);

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
