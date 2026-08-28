import { resolveScheduleByMech, clearScheduleGridCache, ResolvedServiceEntry } from "./scheduleGridService";

export interface ParsedServiceDate {
  date: string;    // DD/MM/YYYY
  dateISO: string; // YYYY-MM-DD
  isGray?: boolean; // pernoite (gray cell in XLSX)
  startTime?: string; // HH:MM (coluna A)
}

/**
 * Parse the XLSX schedule (with exchanges already applied) and return all
 * service dates grouped by mechanographic number.
 *
 * Backed by `scheduleGridService.resolveScheduleByMech` — the single source
 * of truth used by "Meus Serviços", "Trocas" and "Escala Atualizada".
 */
export const parseScheduleXlsx = async (): Promise<Record<string, ParsedServiceDate[]>> => {
  const resolved = await resolveScheduleByMech();
  const out: Record<string, ParsedServiceDate[]> = {};
  for (const [mechKey, entries] of Object.entries(resolved)) {
    // Expose by both normalised and raw mech for backwards compatibility
    const dates: ParsedServiceDate[] = entries.map((e: ResolvedServiceEntry) => ({
      date: e.date,
      dateISO: e.dateISO,
      isGray: e.isGray || false,
    }));
    out[mechKey] = dates;
    if (entries.length > 0) {
      const rawMech = entries[0].mechanographicNumber;
      if (rawMech && rawMech !== mechKey) {
        out[rawMech] = dates;
      }
    }
  }
  return out;
};

export const getServiceDatesForUser = async (mechNumber: string): Promise<ParsedServiceDate[]> => {
  const all = await parseScheduleXlsx();
  return all[mechNumber] || all[mechNumber.replace(/^0+/, '')] || [];
};

export const clearScheduleCache = () => {
  clearScheduleGridCache();
};

/* ---------------- Shift helpers (turnos realmente escalados) ---------------- */

export const SHIFT_LABELS: Record<string, string> = {
  day: 'Turno Diurno',
  morning: 'Turno Manhã',
  afternoon: 'Turno Tarde',
  night: 'Turno Noite',
  overnight: 'Pernoite',
};

/** Deduplica por data (para dropdown de datas), marcando pernoite se existir. */
export const dedupeServiceDates = (list: ParsedServiceDate[]): ParsedServiceDate[] => {
  const map = new Map<string, ParsedServiceDate>();
  for (const d of list) {
    const existing = map.get(d.dateISO);
    if (!existing) map.set(d.dateISO, { ...d });
    else if (d.isGray) existing.isGray = true;
  }
  return Array.from(map.values()).sort((a, b) => a.dateISO.localeCompare(b.dateISO));
};

/** Converte uma entrada da escala no tipo de turno usado nas trocas. */
export const shiftValueForEntry = (d: ParsedServiceDate, dayType: string): string => {
  const t = d.startTime || '';
  if (d.isGray || /^0?0:/.test(t)) return 'overnight';
  if (dayType === 'weekday') return 'day';
  const h = parseInt(t.split(':')[0] || '', 10);
  if (!Number.isNaN(h)) {
    if (h < 12) return 'morning';
    if (h < 18) return 'afternoon';
    return 'night';
  }
  return '';
};

const defaultOptions = (dayType: string) =>
  dayType === 'weekday'
    ? ['day', 'overnight']
    : ['morning', 'afternoon', 'night', 'overnight'];

/**
 * Turnos que o utilizador realmente tem escalados nessa data.
 * Se não for possível determinar (sem horas na escala), devolve as opções padrão.
 */
export const getAvailableShiftsForDate = (
  list: ParsedServiceDate[],
  dateISO: string,
  dayType: string
): { value: string; label: string }[] => {
  if (!dateISO) return [];
  const values = new Set<string>();
  let unknown = false;
  for (const d of list) {
    if (d.dateISO !== dateISO) continue;
    const v = shiftValueForEntry(d, dayType);
    if (v) values.add(v);
    else unknown = true;
  }
  const order = defaultOptions(dayType);
  const final = values.size === 0 || unknown ? order.filter(o => values.has(o) || unknown) : order.filter(o => values.has(o));
  return final.map(v => ({ value: v, label: SHIFT_LABELS[v] }));
};
