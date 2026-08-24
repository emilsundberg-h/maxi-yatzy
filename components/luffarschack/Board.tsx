"use client";

import { useEffect, useRef } from "react";
import { boardFromMoves, cellKey, computeBounds, type PlacedMark } from "@/lib/domain/luffarschack";

const CELL_SIZE = 36;

interface BoardProps {
  moves: PlacedMark[];
  winningCells?: PlacedMark[];
  // Read-only for a completed/spectated match — cells stop being clickable
  // but the board (and its winning-line highlight) still renders.
  interactive: boolean;
  onPlaceMark?: (x: number, y: number) => void;
}

export function Board({ moves, winningCells, interactive, onPlaceMark }: BoardProps) {
  const bounds = computeBounds(moves);
  const board = boardFromMoves(moves);
  const winningKeys = new Set((winningCells ?? []).map((c) => cellKey(c.x, c.y)));
  const cols = bounds.maxX - bounds.minX + 1;
  const rows = bounds.maxY - bounds.minY + 1;

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevBoundsRef = useRef<{ minX: number; minY: number } | undefined>(undefined);

  function scrollToCell(x: number, y: number) {
    const el = scrollRef.current;
    if (!el) return;
    const targetLeft = (x - bounds.minX) * CELL_SIZE - el.clientWidth / 2 + CELL_SIZE / 2;
    const targetTop = (y - bounds.minY) * CELL_SIZE - el.clientHeight / 2 + CELL_SIZE / 2;
    el.scrollTo({ left: targetLeft, top: targetTop, behavior: "smooth" });
  }

  // Center on the latest move (or the origin, for a fresh board) the first
  // time this board is shown. After that, growth is handled purely by the
  // compensation effect below — re-centering on every incoming move would
  // fight a player who's deliberately scrolled elsewhere to look around.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = moves[moves.length - 1];
    const target = last ?? { x: 0, y: 0 };
    el.scrollLeft = (target.x - bounds.minX) * CELL_SIZE - el.clientWidth / 2 + CELL_SIZE / 2;
    el.scrollTop = (target.y - bounds.minY) * CELL_SIZE - el.clientHeight / 2 + CELL_SIZE / 2;
    // Only ever run once, on mount — see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The visible box grows outward (see computeBounds) as marks land near its
  // edge. When it grows on the min side, every existing cell's pixel offset
  // shifts right/down by that amount — compensate scrollLeft/scrollTop by
  // the same delta so already-placed marks don't visually jump.
  useEffect(() => {
    const el = scrollRef.current;
    const prev = prevBoundsRef.current;
    if (el && prev) {
      el.scrollLeft += (prev.minX - bounds.minX) * CELL_SIZE;
      el.scrollTop += (prev.minY - bounds.minY) * CELL_SIZE;
    }
    prevBoundsRef.current = { minX: bounds.minX, minY: bounds.minY };
  }, [bounds.minX, bounds.minY]);

  const cells: React.ReactNode[] = [];
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const placed = board.get(cellKey(x, y));
      const isWinning = winningKeys.has(cellKey(x, y));
      const clickable = interactive && !placed;
      cells.push(
        <button
          key={cellKey(x, y)}
          type="button"
          disabled={!clickable}
          onClick={() => onPlaceMark?.(x, y)}
          className="flex items-center justify-center border text-lg font-bold leading-none"
          style={{
            width: CELL_SIZE,
            height: CELL_SIZE,
            borderColor: "var(--color-line)",
            background: isWinning
              ? "color-mix(in srgb, var(--color-gold-bright) 22%, var(--color-surface))"
              : "var(--color-surface)",
            boxShadow: isWinning ? "0 0 10px var(--color-gold-bright)" : undefined,
            color: placed?.mark === "kryss" ? "var(--color-gold-bright)" : "var(--color-paper)",
            cursor: clickable ? "pointer" : "default",
          }}
        >
          {placed?.mark === "kryss" ? "✕" : placed?.mark === "ring" ? "○" : ""}
        </button>,
      );
    }
  }

  return (
    <div className="relative w-full">
      <div
        ref={scrollRef}
        className="w-full overflow-auto rounded-2xl border"
        style={{ borderColor: "var(--color-line)", maxHeight: "min(65vh, 520px)" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
            width: cols * CELL_SIZE,
          }}
        >
          {cells}
        </div>
      </div>
      <button
        type="button"
        onClick={() => scrollToCell(moves[moves.length - 1]?.x ?? 0, moves[moves.length - 1]?.y ?? 0)}
        aria-label="Centrera senaste draget"
        className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full border text-lg shadow-[0_8px_18px_rgba(0,0,0,.35)]"
        style={{
          borderColor: "var(--color-gold)",
          background: "var(--color-panel)",
          color: "var(--color-gold-bright)",
        }}
      >
        ◎
      </button>
    </div>
  );
}
