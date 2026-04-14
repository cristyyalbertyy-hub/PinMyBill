"use client";

import { useEffect, useId, useState } from "react";
import { useTheme, type ThemePreference } from "@/components/theme-provider";
import { DAY_BG_PALETTE, type DayBackgroundPreset } from "@/lib/theme-storage";
import { useT } from "@/lib/i18n/context";

const pillClass =
  "flex shrink-0 items-center gap-1 rounded-full border border-stone-200/90 bg-white/95 p-1 shadow-md backdrop-blur-sm transition-shadow duration-200 focus-within:shadow-lg focus-within:ring-2 focus-within:ring-pin-accent/25 dark:border-stone-600 dark:bg-stone-900/95 dark:focus-within:ring-teal-400/20";

const MODE_OPTIONS: { value: Exclude<ThemePreference, "system">; emoji: string; labelKey: string }[] = [
  { value: "day", emoji: "☀️", labelKey: "theme.day" },
  { value: "night", emoji: "🌙", labelKey: "theme.night" },
];

function presetLabelKey(preset: DayBackgroundPreset): string {
  switch (preset) {
    case "soft-orange":
      return "theme.presetSoftOrange";
    case "soft-sky":
      return "theme.presetSoftSky";
    case "soft-canary":
      return "theme.presetSoftCanary";
    case "soft-green":
      return "theme.presetSoftGreen";
    case "vivid-orange":
      return "theme.presetVividOrange";
    case "vivid-sky":
      return "theme.presetVividSky";
    case "vivid-canary":
      return "theme.presetVividCanary";
    case "vivid-green":
      return "theme.presetVividGreen";
    default:
      return "theme.bgDefault";
  }
}

type ThemeSwitcherProps = {
  variant?: "floating" | "inline";
  className?: string;
};

export function ThemeSwitcher({ variant = "floating", className = "" }: ThemeSwitcherProps) {
  const t = useT();
  const { preference, setPreference, resolved, dayBackground, setDayBackground } = useTheme();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (resolved !== "day") setOpen(false);
  }, [resolved]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const tintActive = dayBackground !== "default";

  return (
    <div
      className={`pointer-events-auto z-[45] flex items-center gap-1.5 ${
        variant === "floating" ? "fixed md:hidden" : "relative"
      } ${className}`.trim()}
      style={
        variant === "floating"
          ? {
              top: "max(0.75rem, env(safe-area-inset-top))",
              left: "max(0.75rem, env(safe-area-inset-left))",
            }
          : undefined
      }
      role="toolbar"
      aria-label={t("theme.toolbar")}
    >
      <div className={pillClass} role="group" aria-label={t("theme.modeGroup")}>
        {MODE_OPTIONS.map(({ value, emoji, labelKey }) => {
          const active =
            value === "day"
              ? preference === "day" || (preference === "system" && resolved === "day")
              : preference === "night" || (preference === "system" && resolved === "night");
          return (
            <button
              key={value}
              type="button"
              onClick={() => setPreference(value)}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none transition touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pin-accent/50 focus-visible:ring-offset-2 ${
                active
                  ? "bg-pin-teal-soft ring-2 ring-pin-accent dark:bg-teal-950/80 dark:ring-teal-500"
                  : "opacity-75 hover:opacity-100 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
              title={t(labelKey)}
              aria-label={t(labelKey)}
              aria-pressed={active}
            >
              <span aria-hidden>{emoji}</span>
            </button>
          );
        })}
      </div>

      {resolved === "day" ? (
        <div className="relative">
          <div className={pillClass}>
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="dialog"
              aria-controls={panelId}
              onClick={() => setOpen((o) => !o)}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none transition touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pin-accent/50 focus-visible:ring-offset-2 ${
                tintActive
                  ? "bg-pin-teal-soft/80 ring-1 ring-pin-accent/40 dark:bg-teal-950/60 dark:ring-teal-500/50"
                  : "opacity-75 hover:opacity-100 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
              title={t("theme.paletteOpen")}
              aria-label={t("theme.paletteOpen")}
            >
              <span aria-hidden>🎨</span>
            </button>
          </div>

          {open ? (
          <>
            <div
              className="fixed inset-0 z-[50] bg-stone-900/20 dark:bg-black/45"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label={t("theme.paletteTitle")}
              className="absolute left-0 top-[calc(100%+0.45rem)] z-[55] w-[min(17.5rem,calc(100vw-1.75rem))] rounded-2xl border border-stone-200/90 bg-[var(--pin-card)] p-3 shadow-2xl ring-1 ring-stone-200/60 dark:border-stone-600 dark:bg-stone-900/98 dark:ring-stone-600/80"
            >
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
                {DAY_BG_PALETTE.map(({ preset, swatch }) => {
                  const selected = dayBackground === preset;
                  const label = t(presetLabelKey(preset));
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setDayBackground(preset);
                        setOpen(false);
                      }}
                      className={`mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pin-card)] dark:focus-visible:ring-offset-stone-900 ${
                        selected
                          ? "ring-2 ring-pin-accent ring-offset-2 ring-offset-[var(--pin-card)] dark:ring-teal-400 dark:ring-offset-stone-900"
                          : "ring-2 ring-transparent ring-offset-2 ring-offset-[var(--pin-card)] dark:ring-offset-stone-900"
                      }`}
                      style={{
                        backgroundColor: swatch,
                        boxShadow:
                          preset === "default"
                            ? "inset 0 0 0 1.5px rgb(28 25 23 / 0.12)"
                            : "inset 0 0 0 1px rgb(255 255 255 / 0.25)",
                      }}
                      aria-label={label}
                      aria-pressed={selected}
                      title={label}
                    />
                  );
                })}
              </div>
            </div>
          </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
