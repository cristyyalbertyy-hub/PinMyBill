"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useT } from "@/lib/i18n/context";
import { useTheme } from "@/components/theme-provider";

function InstructionsBody() {
  const t = useT();

  return (
    <div className="space-y-5 text-sm leading-relaxed text-pin-muted">
      <section>
        <h3 className="mb-2 font-bold text-pin-ink">{t("instructions.newReceiptTitle")}</h3>
        <p>{t("instructions.newReceiptBody")}</p>
      </section>
      <section>
        <h3 className="mb-2 font-bold text-pin-ink">{t("instructions.historyTitle")}</h3>
        <p>{t("instructions.historyBody")}</p>
      </section>
      <section>
        <h3 className="mb-2 font-bold text-pin-ink">{t("instructions.catTitle")}</h3>
        <p>
          {t("instructions.catBody")}
        </p>
      </section>
      <section>
        <h3 className="mb-2 font-bold text-pin-ink">{t("instructions.exportTitle")}</h3>
        <p>{t("instructions.exportBody")}</p>
      </section>
    </div>
  );
}

export function InstructionsFrame({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const titleId = useId();
  const settingsTitleId = useId();
  const t = useT();
  const {
    preference,
    setPreference,
    resolved,
    dayOverlayColor,
    setDayOverlayColor,
    dayOverlayOpacity,
    setDayOverlayOpacity,
    dayThemeStyle,
    setDayThemeStyle,
  } = useTheme();

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    setOpen(false);
    setSettingsOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onKeyDown]);

  return (
    <>
      {children}
      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4 z-[60] flex items-center gap-2 md:bottom-6">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/40 bg-gradient-to-br from-amber-500 to-orange-700 text-lg font-bold text-white shadow-lg shadow-orange-700/35 ring-2 ring-white/25 touch-manipulation transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:brightness-105 motion-reduce:hover:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 focus-visible:ring-offset-2 dark:border-amber-500/40 dark:from-amber-600 dark:to-orange-900 dark:ring-stone-800"
          aria-label={t("theme.settingsAria")}
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
        >
          S
        </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-teal-400/30 bg-gradient-to-br from-pin-accent to-teal-800 text-lg font-bold text-white shadow-lg shadow-teal-700/35 ring-2 ring-white/25 touch-manipulation transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:brightness-105 motion-reduce:hover:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 focus-visible:ring-offset-2 dark:border-teal-600/40 dark:from-teal-600 dark:to-teal-950 dark:ring-stone-800"
        aria-label={t("instructions.btnAria")}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        ?
      </button>
      </div>
      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-6"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label={t("instructions.close")}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 max-h-[min(88vh,36rem)] w-full max-w-lg overflow-hidden rounded-[1.25rem] border border-stone-200/90 bg-[var(--pin-card)] shadow-[0_25px_60px_-15px_rgba(13,148,136,0.2),0_0_0_1px_rgba(231,229,228,0.6)_inset] ring-1 ring-stone-200/70 backdrop-blur-md dark:border-stone-700 dark:bg-stone-900 dark:shadow-[0_28px_64px_-12px_rgba(0,0,0,0.65)] dark:ring-stone-600/40"
          >
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-700">
              <h2 id={titleId} className="text-lg font-bold text-pin-ink">
                {t("instructions.title")}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-1.5 text-sm font-semibold text-pin-muted transition-colors duration-200 hover:bg-pin-teal-soft hover:text-pin-ink active:scale-[0.98]"
              >
                {t("instructions.close")}
              </button>
            </div>
            <div className="max-h-[min(75vh,30rem)] overflow-y-auto px-4 py-4">
              <InstructionsBody />
            </div>
          </div>
        </div>
      ) : null}
      {settingsOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-6"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label={t("instructions.close")}
            onClick={() => setSettingsOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={settingsTitleId}
            className="relative z-10 w-full max-w-lg rounded-[1.25rem] border border-stone-200/90 bg-[var(--pin-card)] p-4 shadow-[0_25px_60px_-15px_rgba(234,88,12,0.2),0_0_0_1px_rgba(231,229,228,0.6)_inset] ring-1 ring-stone-200/70 backdrop-blur-md dark:border-stone-700 dark:bg-stone-900 dark:shadow-[0_28px_64px_-12px_rgba(0,0,0,0.65)] dark:ring-stone-600/40"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id={settingsTitleId} className="text-lg font-bold text-pin-ink">
                {t("theme.settingsTitle")}
              </h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-xl px-3 py-1.5 text-sm font-semibold text-pin-muted transition-colors duration-200 hover:bg-pin-teal-soft hover:text-pin-ink active:scale-[0.98]"
              >
                {t("instructions.close")}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-semibold text-pin-ink">{t("theme.pick")}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreference("day")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      preference === "day" || (preference === "system" && resolved === "day")
                        ? "bg-pin-accent text-white"
                        : "bg-stone-100 text-pin-ink dark:bg-stone-800 dark:text-stone-100"
                    }`}
                  >
                    {t("theme.day")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreference("night")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      preference === "night" || (preference === "system" && resolved === "night")
                        ? "bg-pin-accent text-white"
                        : "bg-stone-100 text-pin-ink dark:bg-stone-800 dark:text-stone-100"
                    }`}
                  >
                    {t("theme.night")}
                  </button>
                </div>
              </div>

              {resolved === "day" ? (
                <>
                  <div>
                    <p className="mb-2 text-sm font-semibold text-pin-ink">{t("theme.rainbowPalette")}</p>
                    <div className="grid grid-cols-7 gap-2">
                      {["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#6366f1", "#a855f7"].map(
                        (color) => {
                          const selected = dayOverlayColor.toLowerCase() === color;
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setDayOverlayColor(color)}
                              className={`h-8 w-8 rounded-full ring-2 transition ${
                                selected ? "ring-pin-accent" : "ring-transparent"
                              }`}
                              style={{ backgroundColor: color }}
                              aria-label={color}
                              aria-pressed={selected}
                            />
                          );
                        },
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-pin-ink" htmlFor="day-opacity">
                      {t("theme.opacity")}
                    </label>
                    <input
                      id="day-opacity"
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={dayOverlayOpacity}
                      onChange={(e) => setDayOverlayOpacity(Number(e.target.value))}
                      className="w-full accent-pin-accent"
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-pin-ink">{t("theme.themes")}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDayThemeStyle("default")}
                        className={`rounded-full px-3 py-2 text-sm font-semibold ${
                          dayThemeStyle === "default"
                            ? "bg-pin-accent text-white"
                            : "bg-stone-100 text-pin-ink dark:bg-stone-800 dark:text-stone-100"
                        }`}
                      >
                        {t("theme.themeDefault")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDayThemeStyle("almond-blossom")}
                        className={`rounded-full px-3 py-2 text-sm font-semibold ${
                          dayThemeStyle === "almond-blossom"
                            ? "bg-pin-accent text-white"
                            : "bg-stone-100 text-pin-ink dark:bg-stone-800 dark:text-stone-100"
                        }`}
                      >
                        {t("theme.themeAlmondBlossom")}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-pin-muted">{t("theme.onlyDaySettings")}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
