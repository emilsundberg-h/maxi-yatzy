import { create } from "zustand";
import { DEFAULT_THEME, isThemeId, type ThemeId } from "@/lib/theme/themes";

const STORAGE_KEY = "mx-theme";

function readStoredTheme(): ThemeId | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isThemeId(stored) ? stored : null;
}

interface ThemeStoreState {
  theme: ThemeId;
  /** Per-device choice, deliberately not synced to the account — two people
   * in the same match are expected to be able to see the app differently on
   * their own devices. */
  setTheme: (theme: ThemeId) => void;
}

export const useThemeStore = create<ThemeStoreState>((set) => ({
  theme: readStoredTheme() ?? DEFAULT_THEME,

  setTheme(theme) {
    set({ theme });
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
    // Keeps the browser chrome (PWA status bar / Android tab strip) matching
    // the page instead of staying stuck on skog's dark green — read back
    // *after* the data-theme attribute above takes effect, from the same
    // --color-felt-mid token app/globals.css themes the page background with.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const color = getComputedStyle(document.documentElement).getPropertyValue("--color-felt-mid").trim();
      if (color) meta.setAttribute("content", color);
    }
  },
}));
