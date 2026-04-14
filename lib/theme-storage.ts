export const THEME_STORAGE_KEY = "pinmybill-theme";

export const DAY_BG_STORAGE_KEY = "pinmybill-day-bg";
export const DAY_OVERLAY_COLOR_KEY = "pinmybill-day-overlay-color";
export const DAY_OVERLAY_OPACITY_KEY = "pinmybill-day-overlay-opacity";
export const DAY_THEME_STYLE_KEY = "pinmybill-day-theme-style";

/** Fundo no modo dia: predefinido ou tons (suaves e vivos). */
export type DayBackgroundPreset =
  | "default"
  | "soft-orange"
  | "soft-sky"
  | "soft-canary"
  | "soft-green"
  | "vivid-orange"
  | "vivid-sky"
  | "vivid-canary"
  | "vivid-green";

const ALL_PRESETS: readonly DayBackgroundPreset[] = [
  "default",
  "soft-orange",
  "soft-sky",
  "soft-canary",
  "soft-green",
  "vivid-orange",
  "vivid-sky",
  "vivid-canary",
  "vivid-green",
];

/** Cor de preenchimento do círculo na paleta (referência visual). */
export const DAY_BG_PALETTE: readonly { preset: DayBackgroundPreset; swatch: string }[] = [
  { preset: "default", swatch: "#ffffff" },
  { preset: "soft-orange", swatch: "#ffc9a8" },
  { preset: "soft-sky", swatch: "#9ec5ff" },
  { preset: "soft-canary", swatch: "#fde047" },
  { preset: "soft-green", swatch: "#86efac" },
  { preset: "vivid-orange", swatch: "#ea580c" },
  { preset: "vivid-sky", swatch: "#0088ff" },
  { preset: "vivid-canary", swatch: "#facc15" },
  { preset: "vivid-green", swatch: "#16a34a" },
];

export function isDayBackgroundPreset(v: string | null): v is DayBackgroundPreset {
  return ALL_PRESETS.includes(v as DayBackgroundPreset);
}

/** Migra valores antigos do localStorage. */
export function migrateLegacyDayBackground(raw: string | null): DayBackgroundPreset | null {
  if (!raw) return null;
  const map: Record<string, DayBackgroundPreset> = {
    yellow: "soft-canary",
    orange: "soft-orange",
    blue: "soft-sky",
    teal: "soft-green",
    violet: "default",
  };
  if (map[raw]) return map[raw];
  return null;
}

export type DayThemeStyle = "default" | "almond-blossom";

export const DAY_THEME_STYLES: readonly DayThemeStyle[] = ["default", "almond-blossom"];

export function isDayThemeStyle(v: string | null): v is DayThemeStyle {
  return DAY_THEME_STYLES.includes(v as DayThemeStyle);
}
