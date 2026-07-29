"use client";

import { useEffect, useRef, useState } from "react";

const PULL_THRESHOLD = 70; // px pulled down to trigger a refresh on release
const MAX_PULL = 110; // visual cap, so the indicator can't be dragged forever
const RESISTANCE = 0.5; // finger moves further than the indicator does

/**
 * Native touch-based pull-to-refresh — only arms once a downward touch
 * starts with the page already scrolled to the very top, so it never
 * fights normal list scrolling. Attaches its listeners once (via refs,
 * not state) and never re-subscribes mid-gesture.
 */
export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // Separate from `pulling.current` (used inside the listeners) so the
  // consumer can skip its snap/settle transition while a touch is actively
  // dragging — 1:1 finger tracking needs no easing, only the release does.
  const [isPulling, setIsPulling] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || refreshingRef.current) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
      setIsPulling(true);
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current || startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0 || window.scrollY > 0) {
        pulling.current = false;
        setIsPulling(false);
        setPullDistance(0);
        return;
      }
      e.preventDefault();
      setPullDistance(Math.min(delta * RESISTANCE, MAX_PULL));
    }

    function onTouchEnd() {
      if (!pulling.current) {
        startY.current = null;
        return;
      }
      pulling.current = false;
      setIsPulling(false);
      startY.current = null;
      setPullDistance((current) => {
        if (current < PULL_THRESHOLD) return 0;
        refreshingRef.current = true;
        setRefreshing(true);
        Promise.resolve(onRefreshRef.current()).finally(() => {
          refreshingRef.current = false;
          setRefreshing(false);
          setPullDistance(0);
        });
        return PULL_THRESHOLD;
      });
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return { pullDistance, refreshing, isPulling, threshold: PULL_THRESHOLD };
}
