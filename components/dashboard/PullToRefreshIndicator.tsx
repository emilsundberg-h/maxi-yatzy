"use client";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  refreshing: boolean;
  threshold: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  refreshing,
  threshold,
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !refreshing) return null;
  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 top-0 flex items-center justify-center overflow-hidden"
      style={{ height: refreshing ? threshold : pullDistance }}
    >
      <div
        className={`h-6 w-6 rounded-full border-2 border-gold/20 border-t-gold-bright ${
          refreshing ? "animate-spin" : ""
        }`}
        style={{
          opacity: refreshing ? 1 : progress,
          transform: refreshing ? undefined : `rotate(${progress * 360}deg)`,
        }}
      />
    </div>
  );
}
