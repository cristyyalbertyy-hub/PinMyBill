const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string | null | undefined): value is string {
  return Boolean(value && ISO_DATE.test(value));
}

/** Dias inclusivos entre duas datas ISO (YYYY-MM-DD). */
export function countDaysInclusive(startDate: string, endDate: string): number {
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return 0;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function formatDays(n: number) {
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(2).replace(/(\.\d*[1-9])0+$|\.0+$/, "$1");
}

/** @deprecated Mantido para dados antigos; novos registos usam dias. */
export function computeTotalHours(
  startTime: string,
  endTime: string,
  breakMinutes: number,
): number {
  const toMinutes = (t: string) => {
    const parts = t.split(":");
    const h = Number.parseInt(parts[0] ?? "0", 10);
    const m = Number.parseInt(parts[1] ?? "0", 10);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    return h * 60 + m;
  };
  const diff = toMinutes(endTime) - toMinutes(startTime) - Math.max(0, breakMinutes);
  return Math.max(0, Math.round((diff / 60) * 100) / 100);
}

/** @deprecated Usar formatDays. */
export function formatHours(n: number) {
  return formatDays(n);
}
