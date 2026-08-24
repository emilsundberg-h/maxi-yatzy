"use client";

import type { ReactNode } from "react";

interface HandoffScreenProps {
  activePlayerName: string;
  // Yatzy shows "Runda N/20"; Luffarschack (no fixed round count) shows
  // "Drag N" instead — caller decides, this component just lays it out.
  subtitle: ReactNode;
  onReady: () => void;
}

// Same-device matches don't hand off automatically — this gate makes sure
// the device has actually been physically passed on before the next
// player's board/dice become visible (and interactable) to whoever's
// holding it.
export function HandoffScreen({ activePlayerName, subtitle, onReady }: HandoffScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6 text-center">
      <p className="text-[11px] font-bold tracking-[.2em] text-sage">SKICKA ENHETEN TILL</p>
      <h1 className="max-w-full truncate font-serif text-4xl font-semibold text-paper sm:text-5xl">
        {activePlayerName}
      </h1>
      <p className="text-xs text-muted">{subtitle}</p>
      <button
        type="button"
        onClick={onReady}
        className="mt-2 rounded-2xl px-8 py-4 text-[15px] font-extrabold tracking-[.08em] text-[var(--color-ink)] shadow-[0_12px_26px_rgba(0,0,0,.4),inset_0_2px_0_rgba(255,255,255,.45)]"
        style={{ background: "var(--color-accent-grad)" }}
      >
        JAG ÄR REDO
      </button>
    </div>
  );
}
