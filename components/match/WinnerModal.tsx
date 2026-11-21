"use client";

import { motion } from "framer-motion";
import { Confetti } from "./Confetti";

interface WinnerModalProps {
  winnerName: string;
  // Maxi Yatzy wins on total score; Luffarschack wins on 5-in-a-row and has
  // no numeric score, so this — and the "med N poäng" line — is optional.
  winnerScore?: number;
  // Extra line shown instead of/alongside the score, e.g. Luffarschack's
  // "med fem i rad".
  subtitle?: string;
  ctaLabel?: string;
  onClose: () => void;
}

export function WinnerModal({
  winnerName,
  winnerScore,
  subtitle,
  ctaLabel = "VISA PROTOKOLL",
  onClose,
}: WinnerModalProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6">
      <Confetti />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-[81] flex w-full max-w-sm flex-col items-center gap-2 rounded-2xl border border-gold/25 bg-[var(--color-panel)] p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,.5)]"
      >
        <div className="text-[10px] font-extrabold tracking-[.28em] text-gold">
          MATCH AVSLUTAD
        </div>
        <h2 className="font-serif text-3xl font-semibold text-paper">{winnerName} vann!</h2>
        {winnerScore !== undefined && (
          <p className="text-sm text-paper-dim">med {winnerScore} poäng</p>
        )}
        {subtitle && <p className="text-sm text-paper-dim">{subtitle}</p>}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-2xl px-6 py-3 font-extrabold tracking-[.08em] text-[var(--color-ink)] shadow-[0_12px_26px_rgba(0,0,0,.4)]"
          style={{ background: "var(--color-accent-grad)" }}
        >
          {ctaLabel}
        </button>
      </motion.div>
    </div>
  );
}
