/**
 * The set of selectable color themes ("Färgteman"). The actual CSS values
 * (colors, radii, fonts, dice styling) live entirely in `app/globals.css` as
 * `html[data-theme="..."]` overrides of the app's design tokens — this file
 * only holds the bits the picker UI needs to render itself and the id list
 * used to validate/iterate themes.
 *
 * "skog" (forest) is the original/default look and always first.
 */
export type ThemeId = "skog" | "bauhaus" | "kollegie" | "pastell" | "greige";

export const THEME_IDS: ThemeId[] = ["skog", "bauhaus", "kollegie", "pastell", "greige"];

export const DEFAULT_THEME: ThemeId = "skog";

export interface ThemeMeta {
  name: string;
  /** CSS `background` value for the little swatch dot in the picker. */
  dot: string;
}

export const THEMES: Record<ThemeId, ThemeMeta> = {
  skog: { name: "Skog", dot: "linear-gradient(135deg,#0f4132 50%,#e2bf6d 50%)" },
  bauhaus: { name: "Bauhaus", dot: "conic-gradient(#d62828 0 33%, #f2b705 0 66%, #1d4ed8 0)" },
  kollegie: { name: "Kollegieblock", dot: "linear-gradient(90deg,#e0483c 0 18%, #eef3fb 18%)" },
  pastell: { name: "Pastell", dot: "linear-gradient(135deg,#ffc9d8,#cdbdf2 55%,#bfe6de)" },
  greige: { name: "Greige", dot: "linear-gradient(135deg,#e8e3da 50%,#332f2a 50%)" },
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as string[]).includes(value);
}
