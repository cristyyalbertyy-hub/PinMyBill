/** Calcula horas trabalhadas a partir de início, fim e pausa (minutos). */
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

export function formatHours(n: number) {
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(2).replace(/(\.\d*[1-9])0+$|\.0+$/, "$1");
}
