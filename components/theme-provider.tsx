"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { isAuthPublicPath } from "@/lib/auth-public-paths";
import {
  DAY_BG_STORAGE_KEY,
  DAY_OVERLAY_COLOR_KEY,
  DAY_OVERLAY_OPACITY_KEY,
  DAY_THEME_STYLE_KEY,
  THEME_STORAGE_KEY,
  isDayThemeStyle,
  isDayBackgroundPreset,
  migrateLegacyDayBackground,
  type DayThemeStyle,
  type DayBackgroundPreset,
} from "@/lib/theme-storage";

export type ThemePreference = "day" | "night" | "system";

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
  /** Tema efetivo após resolver `system`. */
  resolved: "day" | "night";
  /** Cor de fundo no modo claro (gradientes). */
  dayBackground: DayBackgroundPreset;
  setDayBackground: (preset: DayBackgroundPreset) => void;
  dayOverlayColor: string;
  setDayOverlayColor: (color: string) => void;
  dayOverlayOpacity: number;
  setDayOverlayOpacity: (opacity: number) => void;
  dayThemeStyle: DayThemeStyle;
  setDayThemeStyle: (style: DayThemeStyle) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "day" || raw === "night" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return "system";
}

function readStoredDayBackground(): DayBackgroundPreset {
  if (typeof window === "undefined") return "default";
  try {
    const raw = localStorage.getItem(DAY_BG_STORAGE_KEY);
    if (isDayBackgroundPreset(raw)) return raw;
    const migrated = migrateLegacyDayBackground(raw);
    if (migrated !== null) {
      try {
        if (migrated === "default") localStorage.removeItem(DAY_BG_STORAGE_KEY);
        else localStorage.setItem(DAY_BG_STORAGE_KEY, migrated);
      } catch {
        /* ignore */
      }
      return migrated;
    }
  } catch {
    /* ignore */
  }
  return "default";
}

function applyDayBackgroundAttr(root: HTMLElement, preset: DayBackgroundPreset) {
  if (preset === "default") root.removeAttribute("data-day-bg");
  else root.setAttribute("data-day-bg", preset);
}

function readStoredOverlayColor(): string {
  if (typeof window === "undefined") return "#f97316";
  try {
    const raw = localStorage.getItem(DAY_OVERLAY_COLOR_KEY);
    if (raw && /^#[0-9a-f]{6}$/i.test(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "#f97316";
}

function readStoredOverlayOpacity(): number {
  if (typeof window === "undefined") return 0.3;
  try {
    const raw = Number(localStorage.getItem(DAY_OVERLAY_OPACITY_KEY));
    if (!Number.isNaN(raw)) return Math.min(1, Math.max(0, raw));
  } catch {
    /* ignore */
  }
  return 0.3;
}

function readStoredDayThemeStyle(): DayThemeStyle {
  if (typeof window === "undefined") return "default";
  try {
    const raw = localStorage.getItem(DAY_THEME_STYLE_KEY);
    if (isDayThemeStyle(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "default";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const authThemeLock = isAuthPublicPath(pathname);
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [dayBackground, setDayBackgroundState] = useState<DayBackgroundPreset>("default");
  const [dayOverlayColor, setDayOverlayColorState] = useState("#f97316");
  const [dayOverlayOpacity, setDayOverlayOpacityState] = useState(0.3);
  const [dayThemeStyle, setDayThemeStyleState] = useState<DayThemeStyle>("default");
  const [systemDark, setSystemDark] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPreferenceState(readStoredPreference());
    setDayBackgroundState(readStoredDayBackground());
    setDayOverlayColorState(readStoredOverlayColor());
    setDayOverlayOpacityState(readStoredOverlayOpacity());
    setDayThemeStyleState(readStoredDayThemeStyle());
    setSystemDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    setHydrated(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved: "day" | "night" =
    preference === "night" ? "night" : preference === "day" ? "day" : systemDark ? "night" : "day";

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    /** Login/registo: sempre aspeto noite; preferências ficam no localStorage para depois do login. */
    const displayNight = authThemeLock || resolved === "night";
    root.classList.toggle("dark", displayNight);
    root.style.colorScheme = displayNight ? "dark" : "light";
    if (displayNight) {
      root.removeAttribute("data-day-bg");
      root.removeAttribute("data-day-theme-style");
      root.style.removeProperty("--pin-day-overlay-rgb");
      root.style.removeProperty("--pin-day-overlay-opacity");
    } else {
      applyDayBackgroundAttr(root, dayBackground);
      root.setAttribute("data-day-theme-style", dayThemeStyle);
      const rgb = dayOverlayColor
        .replace("#", "")
        .match(/.{1,2}/g)
        ?.map((chunk) => Number.parseInt(chunk, 16))
        .join(" ");
      if (rgb) root.style.setProperty("--pin-day-overlay-rgb", rgb);
      root.style.setProperty("--pin-day-overlay-opacity", String(dayOverlayOpacity));
    }
  }, [hydrated, authThemeLock, resolved, dayBackground, dayOverlayColor, dayOverlayOpacity, dayThemeStyle]);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  }, []);

  const persistDayBg = useCallback((next: DayBackgroundPreset) => {
    try {
      if (next === "default") localStorage.removeItem(DAY_BG_STORAGE_KEY);
      else localStorage.setItem(DAY_BG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const setDayBackground = useCallback(
    (next: DayBackgroundPreset) => {
      setDayBackgroundState(next);
      persistDayBg(next);
    },
    [persistDayBg],
  );

  const setDayOverlayColor = useCallback((color: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;
    setDayOverlayColorState(color);
    try {
      localStorage.setItem(DAY_OVERLAY_COLOR_KEY, color);
    } catch {
      /* ignore */
    }
  }, []);

  const setDayOverlayOpacity = useCallback((opacity: number) => {
    const normalized = Math.min(1, Math.max(0, opacity));
    setDayOverlayOpacityState(normalized);
    try {
      localStorage.setItem(DAY_OVERLAY_OPACITY_KEY, String(normalized));
    } catch {
      /* ignore */
    }
  }, []);

  const setDayThemeStyle = useCallback((style: DayThemeStyle) => {
    setDayThemeStyleState(style);
    try {
      if (style === "default") localStorage.removeItem(DAY_THEME_STYLE_KEY);
      else localStorage.setItem(DAY_THEME_STYLE_KEY, style);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      resolved,
      dayBackground,
      setDayBackground,
      dayOverlayColor,
      setDayOverlayColor,
      dayOverlayOpacity,
      setDayOverlayOpacity,
      dayThemeStyle,
      setDayThemeStyle,
    }),
    [
      preference,
      setPreference,
      resolved,
      dayBackground,
      setDayBackground,
      dayOverlayColor,
      setDayOverlayColor,
      dayOverlayOpacity,
      setDayOverlayOpacity,
      dayThemeStyle,
      setDayThemeStyle,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
