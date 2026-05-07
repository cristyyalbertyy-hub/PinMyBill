"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/context";
import { useTheme } from "@/components/theme-provider";
import { isAuthPublicPath } from "@/lib/auth-public-paths";

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
  const [backupOpen, setBackupOpen] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState<string | null>(null);
  const [showImportPicker, setShowImportPicker] = useState(false);
  const titleId = useId();
  const settingsTitleId = useId();
  const backupTitleId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pathname = usePathname();
  const hideFloatingActions = isAuthPublicPath(pathname);
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
    setBackupOpen(false);
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

  useEffect(() => {
    if (!hideFloatingActions) return;
    setOpen(false);
    setSettingsOpen(false);
    setBackupOpen(false);
    setShowImportPicker(false);
    setSelectedBackupFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [hideFloatingActions]);

  async function onExportBackup() {
    try {
      setBackupBusy(true);
      const res = await fetch("/api/backup", { cache: "no-store" });
      if (!res.ok) throw new Error("export-failed");
      const payload = await res.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `pinmybill-backup-${ts}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.alert(t("backup.exportError"));
    } finally {
      setBackupBusy(false);
    }
  }

  async function onImportBackup(file: File) {
    try {
      setBackupBusy(true);
      const text = await file.text();
      const backup = JSON.parse(text) as unknown;
      if (!window.confirm(t("backup.replaceConfirm"))) return;
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replace: true, backup }),
      });
      if (!res.ok) throw new Error("restore-failed");
      window.alert(t("backup.restoreOk"));
      window.location.reload();
    } catch {
      window.alert(t("backup.restoreError"));
    } finally {
      setBackupBusy(false);
      setSelectedBackupFile(null);
      setShowImportPicker(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <>
      {children}
      {!hideFloatingActions ? (
      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4 z-[60] flex items-center gap-2 md:bottom-6">
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => setBackupOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-sky-400/40 bg-gradient-to-br from-sky-500 to-blue-800 text-lg font-bold text-white shadow-lg shadow-blue-700/35 ring-2 ring-white/25 touch-manipulation transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:brightness-105 motion-reduce:hover:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80 focus-visible:ring-offset-2 dark:border-sky-500/40 dark:from-sky-600 dark:to-blue-900 dark:ring-stone-800"
            aria-label={t("backup.buttonAria")}
            aria-haspopup="dialog"
            aria-expanded={backupOpen}
          >
            B
          </button>
          <span className="text-[10px] font-normal text-pin-soft">Backup</span>
        </div>
        <div className="flex flex-col items-center gap-1">
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
          <span className="text-[10px] font-normal text-pin-soft">Setup</span>
        </div>
        <div className="flex flex-col items-center gap-1">
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
          <span className="text-[10px] font-normal text-pin-soft">Help</span>
        </div>
      </div>
      ) : null}
      {!hideFloatingActions && open ? (
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
      {!hideFloatingActions && settingsOpen ? (
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
                    <div className="grid grid-cols-8 gap-2">
                      {["#ffffff", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#6366f1", "#a855f7"].map(
                        (color) => {
                          const selected = dayOverlayColor.toLowerCase() === color;
                          const isWhite = color === "#ffffff";
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setDayOverlayColor(color)}
                              className={`h-8 w-8 rounded-full ring-2 transition ${
                                selected ? "ring-pin-accent" : "ring-transparent"
                              }`}
                              style={{
                                backgroundColor: color,
                                boxShadow: isWhite
                                  ? "inset 0 0 0 1.5px rgb(28 25 23 / 0.24)"
                                  : "inset 0 0 0 1px rgb(255 255 255 / 0.25)",
                              }}
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
                      {t("theme.opacity")} ({Math.round(dayOverlayOpacity * 100)})
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
                    <div className="mt-1 flex items-center justify-between text-xs font-semibold text-pin-muted">
                      <span>0</span>
                      <span>100</span>
                    </div>
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
                    {dayThemeStyle === "almond-blossom" ? (
                      <p className="mt-2 text-xs font-medium text-pin-muted">{t("theme.almondOpacityHint")}</p>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-sm text-pin-muted">{t("theme.onlyDaySettings")}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {!hideFloatingActions && backupOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-6"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label={t("instructions.close")}
            onClick={() => setBackupOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={backupTitleId}
            className="relative z-10 w-full max-w-lg rounded-[1.25rem] border border-stone-200/90 bg-[var(--pin-card)] p-4 shadow-[0_25px_60px_-15px_rgba(14,116,144,0.2),0_0_0_1px_rgba(231,229,228,0.6)_inset] ring-1 ring-stone-200/70 backdrop-blur-md dark:border-stone-700 dark:bg-stone-900 dark:shadow-[0_28px_64px_-12px_rgba(0,0,0,0.65)] dark:ring-stone-600/40"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id={backupTitleId} className="text-lg font-bold text-pin-ink">
                {t("backup.title")}
              </h2>
              <button
                type="button"
                onClick={() => setBackupOpen(false)}
                className="rounded-xl px-3 py-1.5 text-sm font-semibold text-pin-muted transition-colors duration-200 hover:bg-pin-teal-soft hover:text-pin-ink active:scale-[0.98]"
              >
                {t("instructions.close")}
              </button>
            </div>
            <p className="mb-4 text-sm text-pin-muted">{t("backup.lead")}</p>
            <div className="space-y-3">
              <section className="rounded-xl border border-stone-200/90 bg-white/60 p-3 dark:border-stone-700 dark:bg-stone-800/40">
                <h3 className="mb-1 text-sm font-bold text-pin-ink">{t("backup.exportSectionTitle")}</h3>
                <p className="mb-3 text-xs text-pin-muted">{t("backup.exportSectionLead")}</p>
                <button
                  type="button"
                  onClick={() => void onExportBackup()}
                  disabled={backupBusy}
                  className="w-full rounded-xl bg-pin-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
                >
                  {backupBusy ? t("backup.working") : t("backup.exportNow")}
                </button>
              </section>

              <section className="rounded-xl border border-stone-200/90 bg-white/60 p-3 dark:border-stone-700 dark:bg-stone-800/40">
                <h3 className="mb-1 text-sm font-bold text-pin-ink">{t("backup.importSectionTitle")}</h3>
                <p className="mb-3 text-xs text-pin-muted">{t("backup.importSectionLead")}</p>
                <button
                  type="button"
                  disabled={backupBusy}
                  onClick={() => setShowImportPicker(true)}
                  className="w-full rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60 dark:bg-sky-600"
                >
                  {t("backup.importNow")}
                </button>

                {showImportPicker ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/json,.json"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setSelectedBackupFile(file?.name ?? null);
                        if (file) void onImportBackup(file);
                      }}
                      disabled={backupBusy}
                    />
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={backupBusy}
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-sm font-semibold text-pin-ink transition hover:bg-stone-200 disabled:opacity-60 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
                      >
                        {t("backup.chooseFile")}
                      </button>
                      <span className="truncate text-sm text-pin-muted">
                        {selectedBackupFile ?? t("backup.noFileChosen")}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-pin-muted">{t("backup.replaceModeNote")}</p>
                  </>
                ) : null}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
