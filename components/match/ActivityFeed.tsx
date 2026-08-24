"use client";

import { CATEGORY_LABELS } from "@/lib/domain/categories";
import type { Mark } from "@/lib/domain/luffarschack";
import type { ActivityEvent, CategoryId, GameType, Player } from "@/lib/domain/types";

function describeEvent(
  event: ActivityEvent,
  players: Record<string, Player>,
  game: GameType,
): string {
  const name = players[event.playerId]?.name ?? "Spelare";
  switch (event.type) {
    case "turn_started":
      return game === "luffarschack"
        ? `${name}s tur börjar`
        : `${name}s tur börjar (kategori ${event.turnNumber}/20)`;
    case "mark_placed": {
      const payload = event.payload as { x: number; y: number; mark: Mark };
      const symbol = payload.mark === "kryss" ? "ett kryss" : "en ring";
      return `${name} satte ${symbol} på (${payload.x}, ${payload.y})`;
    }
    case "roll": {
      const payload = event.payload as { dice: number[] } | null;
      return `${name} kastade: ${payload?.dice.join(", ") ?? ""}`;
    }
    case "roll_borrowed": {
      const payload = event.payload as { dice: number[] } | null;
      return `${name} använde ett sparat kast: ${payload?.dice.join(", ") ?? ""}`;
    }
    case "lock_toggle": {
      const payload = event.payload as { locked: boolean } | null;
      return `${name} ${payload?.locked ? "låste" : "låste upp"} en tärning`;
    }
    case "category_scored": {
      const payload = event.payload as {
        categoryId: CategoryId;
        points: number;
      };
      return `${name} valde ${CATEGORY_LABELS[payload.categoryId]}: ${payload.points} poäng`;
    }
    case "roll_banked": {
      const payload = event.payload as { bankedGain: number };
      return `${name} sparade ${payload.bankedGain} kast till senare`;
    }
    default:
      return `${name} gjorde ett drag`;
  }
}

interface ActivityFeedProps {
  events: ActivityEvent[];
  players: Record<string, Player>;
  game?: GameType;
}

export function ActivityFeed({ events, players, game = "maxi_yatzy" }: ActivityFeedProps) {
  const recent = [...events].reverse().slice(0, 12);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-gold/15 bg-surface p-4 text-sm">
      <h4 className="mb-2 text-[10px] font-extrabold tracking-[.24em] text-sage">
        AKTIVITET
      </h4>
      {recent.length === 0 && <p className="text-muted-dim">Inget har hänt än.</p>}
      <ul className="flex flex-col gap-1.5">
        {recent.map((e) => (
          <li key={e.id} className="text-paper-dim">
            {describeEvent(e, players, game)}
          </li>
        ))}
      </ul>
    </div>
  );
}
