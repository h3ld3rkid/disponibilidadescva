import * as XLSX from 'xlsx';
import { systemSettingsService } from "@/services/supabase/systemSettingsService";
import { supabase } from "@/integrations/supabase/client";

/**
 * Centralised schedule resolver.
 *
 * Reads the official XLSX schedule, applies accepted exchanges chronologically
 * (with shift-compatibility matching, exactly like the "Escala Atualizada"
 * view) and returns a map of mechanographic_number -> [{ date, dateISO }].
 *
 * This is the single source of truth used by:
 *   - "Meus Serviços" (MyServices)
 *   - "Trocas" date dropdowns (ShiftExchange / BroadcastExchangeDialog)
 *   - "Escala Atualizada" (UpdatedSchedule) — visual grid
 *
 * Keeping these aligned guarantees that what the user sees on the schedule is
 * exactly what they can offer/request in an exchange.
 */

export interface ResolvedServiceDate {
  date: string;    // DD/MM/YYYY
  dateISO: string; // YYYY-MM-DD
}

export interface ResolvedServiceEntry extends ResolvedServiceDate {
  mechanographicNumber: string;
  name: string;
  isModified: boolean; // changed by an accepted exchange
  isGray?: boolean;    // pernoite (gray-background cell in XLSX)
}

interface AcceptedExchange {
  id: string;
  requester_email: string;
  requester_name: string;
  target_email: string;
  target_name: string;
  requested_date: string;
  requested_shift: string;
  offered_date: string;
  offered_shift: string;
  responded_at?: string | null;
}

type ExchangeShiftKey = 'day' | 'overnight' | 'morning' | 'afternoon' | 'night';

// --- caching ---
let cachedByMech: Record<string, ResolvedServiceEntry[]> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const clearScheduleGridCache = () => {
  cachedByMech = null;
  cacheTimestamp = 0;
};

// --- helpers ---
const pad2 = (n: number) => String(n).padStart(2, '0');
const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;

const normalizeDateStr = (dateStr: string): string => {
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (year.length === 2) {
      const yn = parseInt(year, 10);
      const full = yn >= 0 && yn <= 50 ? `20${year}` : `19${year}`;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${full}`;
    }
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateStr;
};

const ptToISO = (pt: string): string => {
  const parts = pt.split('/');
  if (parts.length !== 3) return '';
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

const normalizeMechKey = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  const noSpaces = raw.replace(/\s+/g, '');
  const noTrailingDecimal = noSpaces.replace(/\.0+$/, '');
  const digitsOnly = noTrailingDecimal.replace(/\D/g, '');
  if (digitsOnly) return digitsOnly.replace(/^0+/, '') || '0';
  return noTrailingDecimal.toUpperCase();
};

const normalizeNameKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const normalizeShiftKey = (value: string | null | undefined): ExchangeShiftKey | '' => {
  if (!value) return '';
  const normalized = normalizeNameKey(value);
  if (normalized === 'M' || normalized.includes('MANHA')) return 'morning';
  if (normalized === 'T' || normalized.includes('TARDE')) return 'afternoon';
  if (normalized === 'N' || normalized.includes('NOITE')) return 'night';
  if (normalized === 'P' || normalized.includes('PERNOITE')) return 'overnight';
  if (normalized === 'D' || normalized.includes('DIURNO') || normalized.includes('DIA')) return 'day';
  return '';
};

const shiftMatchesRow = (
  exchangeShift: string | null | undefined,
  rowShift: ExchangeShiftKey | ''
): boolean => {
  const normalizedExchange = normalizeShiftKey(exchangeShift);
  if (!normalizedExchange) return true;
  if (!rowShift) return false;
  if (normalizedExchange === rowShift) return true;

  const compatibleShiftMap: Record<ExchangeShiftKey, ExchangeShiftKey[]> = {
    morning: ['day'],
    day: ['morning'],
    night: ['overnight'],
    overnight: ['night'],
    afternoon: [],
  };
  return compatibleShiftMap[normalizedExchange].includes(rowShift);
};

const toExcelDate = (rawDate: string): string => {
  if (!rawDate) return '';
  const iso = rawDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${pad2(Number(iso[3]))}/${pad2(Number(iso[2]))}/${iso[1]}`;
  const dmy = rawDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const fullYear = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${pad2(Number(dmy[1]))}/${pad2(Number(dmy[2]))}/${fullYear}`;
  }
  return rawDate;
};

/**
 * Resolve schedule with exchanges applied. Returns a map keyed by the
 * normalised mechanographic number (digits only, no leading zeros).
 */
export const resolveScheduleByMech = async (
  forceRefresh = false
): Promise<Record<string, ResolvedServiceEntry[]>> => {
  if (!forceRefresh && cachedByMech && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedByMech;
  }

  const xlsxUrl = await systemSettingsService.getSystemSetting('schedule_xlsx_link');
  if (!xlsxUrl) {
    console.log('[scheduleGridService] No XLSX configured');
    return {};
  }

  try {
    const [response, exchangesRes, usersRes] = await Promise.all([
      fetch(xlsxUrl, { mode: 'cors', credentials: 'omit' }),
      supabase
        .from('shift_exchange_requests')
        .select('*')
        .eq('status', 'accepted')
        .order('responded_at', { ascending: true }),
      supabase.from('users').select('email, name, mechanographic_number'),
    ]);

    if (!response.ok) throw new Error(`Failed to fetch XLSX: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();

    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellStyles: true,
      cellNF: true,
      cellDates: false,
    });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const merges: XLSX.Range[] = (sheet['!merges'] || []) as XLSX.Range[];

    // Detect header month/year for day-only cells
    let headerMonth: number | undefined;
    let headerYear: number | undefined;
    const monthMap: Record<string, number> = {
      janeiro: 1, fevereiro: 2, 'março': 3, marco: 3, abril: 4, maio: 5,
      junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
    };
    for (let r = range.s.r; r <= Math.min(range.s.r + 20, range.e.r); r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = (sheet as any)[addr];
        if (!cell) continue;
        if (typeof cell.v === 'string') {
          const s = cell.v.toLowerCase();
          for (const [mName, mNum] of Object.entries(monthMap)) {
            if (s.includes(mName)) headerMonth = headerMonth ?? mNum;
          }
          const ym = s.match(/\b(20\d{2})\b/);
          if (ym) headerYear = headerYear ?? parseInt(ym[1], 10);
        } else if (typeof cell.v === 'number') {
          if (cell.v >= 2020 && cell.v <= 2035) headerYear = headerYear ?? cell.v;
          if (cell.v > 40000 && cell.v < 60000) {
            const dc = XLSX.SSF.parse_date_code(cell.v);
            if (dc) {
              headerMonth = headerMonth ?? dc.m;
              headerYear = headerYear ?? dc.y;
            }
          }
        }
      }
    }

    const parseDateVal = (val: any, formatted?: string): string => {
      if (formatted && datePattern.test(formatted)) {
        const m = formatted.match(datePattern);
        if (m) return normalizeDateStr(m[1]);
      }
      if (typeof val === 'string') {
        const m = val.match(datePattern);
        if (m) return normalizeDateStr(m[1]);
      }
      if (typeof val === 'number') {
        if (val > 40000 && val < 60000) {
          const dc = XLSX.SSF.parse_date_code(val);
          if (dc) return `${pad2(dc.d)}/${pad2(dc.m)}/${dc.y}`;
        }
        if (val >= 1 && val <= 31 && headerMonth && headerYear) {
          return `${pad2(val)}/${pad2(headerMonth)}/${headerYear}`;
        }
      }
      return '';
    };

    // Build dateByRow
    const dateByRow: Record<number, string> = {};
    for (const m of merges) {
      if (m.s.c === range.s.c && m.e.c === range.s.c) {
        const addr = XLSX.utils.encode_cell({ r: m.s.r, c: range.s.c });
        const cell = (sheet as any)[addr];
        const parsed = parseDateVal(cell?.v, cell?.w);
        if (parsed) {
          for (let r = m.s.r; r <= m.e.r; r++) dateByRow[r] = parsed;
        }
      }
    }
    for (let r = range.s.r; r <= range.e.r; r++) {
      if (dateByRow[r]) continue;
      const addr = XLSX.utils.encode_cell({ r, c: range.s.c });
      const cell = (sheet as any)[addr];
      const parsed = parseDateVal(cell?.v, cell?.w);
      if (parsed) dateByRow[r] = parsed;
    }
    // Forward fill
    let lastKnown = '';
    for (let r = range.s.r; r <= range.e.r; r++) {
      if (dateByRow[r]) lastKnown = dateByRow[r];
      else if (lastKnown) dateByRow[r] = lastKnown;
    }
    // Backward fill
    let nextKnown = '';
    for (let r = range.e.r; r >= range.s.r; r--) {
      if (dateByRow[r]) nextKnown = dateByRow[r];
      else if (nextKnown) dateByRow[r] = nextKnown;
    }

    // Resolve cell value through merges
    const resolveCellValue = (row: number, col: number): string => {
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      let cell = (sheet as any)[addr];
      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
        if (cell.t === 'e') return '';
        if (cell.w !== undefined && cell.w !== null && cell.w !== '') return String(cell.w).trim();
        return String(cell.v).trim();
      }
      for (const m of merges) {
        if (row >= m.s.r && row <= m.e.r && col >= m.s.c && col <= m.e.c) {
          const masterAddr = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
          const master = (sheet as any)[masterAddr];
          if (master && master.v !== undefined && master.v !== null) {
            if (master.t === 'e') return '';
            if (master.w !== undefined && master.w !== null && master.w !== '') return String(master.w).trim();
            return String(master.v).trim();
          }
        }
      }
      return '';
    };

    // Detect row shift (column D = range.s.c + 3)
    const shiftCol = range.s.c + 3;
    const rowShiftByRow: Record<number, ExchangeShiftKey> = {};
    for (let r = range.s.r; r <= range.e.r; r++) {
      const fromShiftCol = normalizeShiftKey(resolveCellValue(r, shiftCol));
      if (fromShiftCol) {
        rowShiftByRow[r] = fromShiftCol;
        continue;
      }
      for (let c = range.s.c; c <= range.e.c; c++) {
        const detected = normalizeShiftKey(resolveCellValue(r, c));
        if (detected) {
          rowShiftByRow[r] = detected;
          break;
        }
      }
    }

    // User lookup
    const usersByEmail = new Map<string, { name: string; mech: string }>();
    const usersByMech = new Map<string, { email: string; name: string; mech: string }>();
    for (const u of (usersRes.data || [])) {
      usersByEmail.set(u.email, { name: u.name, mech: u.mechanographic_number });
      const mk = normalizeMechKey(u.mechanographic_number);
      if (mk) usersByMech.set(mk, { email: u.email, name: u.name, mech: u.mechanographic_number });
    }

    const exchanges: AcceptedExchange[] = (exchangesRes.data || []) as AcceptedExchange[];

    // Build cell-level "current mech" map by replaying exchanges chronologically.
    // Key: `${row},${col}` -> current mechanographic number occupying that slot.
    const cellMechByKey = new Map<string, string>();

    // First pass: collect all original mech cells from XLSX
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const val = resolveCellValue(r, c);
        if (!val) continue;
        const mk = normalizeMechKey(val);
        if (mk && usersByMech.has(mk)) {
          cellMechByKey.set(`${r},${c}`, mk);
        }
      }
    }

    // Replay accepted exchanges chronologically, updating which mech occupies each cell
    for (const ex of exchanges) {
      const exReqDate = toExcelDate(ex.requested_date);
      const exOffDate = toExcelDate(ex.offered_date);
      const requesterMechKey = (() => {
        const u = usersByEmail.get(ex.requester_email);
        return u ? normalizeMechKey(u.mech) : '';
      })();
      const targetMechKey = (() => {
        const u = usersByEmail.get(ex.target_email);
        return u ? normalizeMechKey(u.mech) : '';
      })();
      if (!requesterMechKey || !targetMechKey) continue;

      // Walk every cell that currently has a mech, see if it matches the swap criteria
      const updates: Array<[string, string]> = [];
      for (const [key, currentMech] of cellMechByKey.entries()) {
        const [rowStr] = key.split(',');
        const r = parseInt(rowStr, 10);
        const rowDate = dateByRow[r];
        const rowShift = rowShiftByRow[r] || '';
        if (!rowDate) continue;

        // Target gives requested_date to requester
        if (
          rowDate === exReqDate &&
          shiftMatchesRow(ex.requested_shift, rowShift) &&
          currentMech === targetMechKey
        ) {
          updates.push([key, requesterMechKey]);
          continue;
        }
        // Requester gives offered_date to target (skip broadcasts where offered is empty)
        if (
          exOffDate &&
          rowDate === exOffDate &&
          shiftMatchesRow(ex.offered_shift, rowShift) &&
          currentMech === requesterMechKey
        ) {
          updates.push([key, targetMechKey]);
        }
      }
      for (const [k, v] of updates) cellMechByKey.set(k, v);
    }

    // Build result map
    const result: Record<string, ResolvedServiceEntry[]> = {};
    for (const [key, mechKey] of cellMechByKey.entries()) {
      const [rowStr] = key.split(',');
      const r = parseInt(rowStr, 10);
      const rowDate = dateByRow[r];
      if (!rowDate) continue;
      const iso = ptToISO(rowDate);
      if (!iso) continue;
      const userInfo = usersByMech.get(mechKey);
      if (!userInfo) continue;

      // Was this cell modified vs. its original value?
      const origVal = (() => {
        // re-read original cell to compare
        const [rs, cs] = key.split(',').map(Number);
        const orig = resolveCellValue(rs, cs);
        return normalizeMechKey(orig);
      })();
      const isModified = origVal !== mechKey;

      if (!result[mechKey]) result[mechKey] = [];
      // Avoid duplicates (same date+shift)
      if (!result[mechKey].some(e => e.dateISO === iso)) {
        result[mechKey].push({
          date: rowDate,
          dateISO: iso,
          mechanographicNumber: userInfo.mech,
          name: userInfo.name,
          isModified,
        });
      }
    }

    // Sort
    for (const k of Object.keys(result)) {
      result[k].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    }

    cachedByMech = result;
    cacheTimestamp = Date.now();
    console.log(
      `[scheduleGridService] Resolved schedule: ${Object.keys(result).length} users, ` +
      `${exchanges.length} exchanges applied`
    );
    return result;
  } catch (err) {
    console.error('[scheduleGridService] Error:', err);
    return {};
  }
};

/**
 * Convenience: get resolved entries for a specific user by mechanographic number.
 * Accepts the raw mech as stored on the user; normalises it internally.
 */
export const getResolvedServicesForMech = async (
  mechNumber: string
): Promise<ResolvedServiceEntry[]> => {
  const all = await resolveScheduleByMech();
  const key = normalizeMechKey(mechNumber);
  return all[key] || [];
};
