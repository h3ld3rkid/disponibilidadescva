import { resolveScheduleByMech, clearScheduleGridCache, ResolvedServiceEntry } from "./scheduleGridService";

export interface ParsedServiceDate {
  date: string;    // DD/MM/YYYY
  dateISO: string; // YYYY-MM-DD
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
