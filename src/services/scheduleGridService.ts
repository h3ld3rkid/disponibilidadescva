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
  startTime?: string; // HH:MM (from column A, if present)
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
 * Detect if a cell has a gray background (used to mark pernoite continuations).
 * Mirrors the logic from UpdatedSchedule.tsx getCellBgColor + grayness test.
 */
const isCellGray = (cell: any): boolean => {
  if (!cell?.s) return false;
  const style = cell.s;

  const hexToRgb = (hex: string): [number, number, number] | null => {
    if (!hex || typeof hex !== 'string') return null;
    const clean = hex.replace(/^#/, '').toUpperCase();
    const rgbHex = clean.length === 8 ? clean.slice(2) : clean.length === 6 ? clean : '';
    if (rgbHex.length !== 6) return null;
    const r = parseInt(rgbHex.slice(0, 2), 16);
    const g = parseInt(rgbHex.slice(2, 4), 16);
    const b = parseInt(rgbHex.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  };

  const extractRgb = (color: any): [number, number, number] | null => {
    if (!color) return null;
    if (typeof color === 'string') return hexToRgb(color);
    if (typeof color.rgb === 'string') return hexToRgb(color.rgb);
    return null;
  };

  let rgb: [number, number, number] | null =
    extractRgb(style.fgColor) ||
    extractRgb(style.fill?.fgColor) ||
    extractRgb(style.bgColor) ||
    extractRgb(style.fill?.bgColor);

  if (!rgb) {
    const indexed =
      style.fgColor?.indexed ?? style.fill?.fgColor?.indexed ??
      style.bgColor?.indexed ?? style.fill?.bgColor?.indexed;
    if (indexed === 22) rgb = [192, 192, 192];
    else if (indexed === 23) rgb = [128, 128, 128];
    else if (indexed === 55) rgb = [153, 153, 153];

    if (!rgb) {
      const theme = style.fgColor?.theme ?? style.fill?.fgColor?.theme;
      const tint = style.fgColor?.tint ?? style.fill?.fgColor?.tint;
      if (theme === 0 && tint && tint < 0) {
        const g = Math.round(255 * (1 + tint));
        rgb = [g, g, g];
      } else if (theme === 1 && tint && tint > 0) {
        const g = Math.round(255 * tint);
        rgb = [g, g, g];
      }
    }
  }

  if (!rgb) return false;
  const [r, g, b] = rgb;
  // Gray = R≈G≈B and not white
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min > 15) return false; // not a neutral tone
  if (max >= 245) return false;     // white-ish, not gray
  if (max < 80) return false;       // too dark (likely black)
  return true;
};

const getDirectSheetCell = (sheet: XLSX.WorkSheet, row: number, col: number) => {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  return (sheet as any)[addr];
};

const resolveSheetCell = (
  sheet: XLSX.WorkSheet,
  merges: XLSX.Range[],
  row: number,
  col: number
) => {
  for (const m of merges) {
    if (row >= m.s.r && row <= m.e.r && col >= m.s.c && col <= m.e.c) {
      if (row !== m.s.r || col !== m.s.c) {
        return getDirectSheetCell(sheet, m.s.r, m.s.c);
      }
      break;
    }
  }

  const direct = getDirectSheetCell(sheet, row, col);
  if (direct && (direct.v !== undefined || direct.w !== undefined || direct.s)) {
    return direct;
  }

  for (const m of merges) {
    if (row >= m.s.r && row <= m.e.r && col >= m.s.c && col <= m.e.c) {
      return getDirectSheetCell(sheet, m.s.r, m.s.c);
    }
  }

  return direct;
};

const getCellFillKey = (cell: any): string => {
  if (!cell?.s) return '';
  const style = cell.s;
  return [
    style.patternType ?? style.fill?.patternType ?? '',
    style.fgColor?.rgb ?? style.fill?.fgColor?.rgb ?? '',
    style.bgColor?.rgb ?? style.fill?.bgColor?.rgb ?? '',
    style.fgColor?.indexed ?? style.fill?.fgColor?.indexed ?? '',
    style.bgColor?.indexed ?? style.fill?.bgColor?.indexed ?? '',
    style.fgColor?.theme ?? style.fill?.fgColor?.theme ?? '',
    style.bgColor?.theme ?? style.fill?.bgColor?.theme ?? '',
    style.fgColor?.tint ?? style.fill?.fgColor?.tint ?? '',
    style.bgColor?.tint ?? style.fill?.bgColor?.tint ?? '',
  ].join('|');
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

    const timePattern = /(\d{1,2})\s*[:hH.]\s*(\d{2})/;
    const parseTimeVal = (val: any, formatted?: string): string => {
      const tryStr = (s: string): string => {
        const m = s.match(timePattern);
        if (!m) return '';
        const h = parseInt(m[1], 10);
        const mi = parseInt(m[2], 10);
        if (isNaN(h) || isNaN(mi) || h > 23 || mi > 59) return '';
        return `${pad2(h)}:${pad2(mi)}`;
      };
      if (formatted) {
        const r = tryStr(String(formatted));
        if (r) return r;
      }
      if (typeof val === 'string') {
        const r = tryStr(val);
        if (r) return r;
      }
      if (typeof val === 'number' && val > 0 && val < 1) {
        const totalMin = Math.round(val * 24 * 60);
        const h = Math.floor(totalMin / 60);
        const mi = totalMin % 60;
        return `${pad2(h)}:${pad2(mi)}`;
      }
      return '';
    };

    // Build dateByRow from explicit date rows in column A, then expand within the
    // same visual color block. This fixes gray overnight blocks whose weekday row
    // sits above the actual date row inside the same merged-looking section.
    const firstCol = range.s.c;
    const explicitDateByRow: Record<number, string> = {};
    const explicitTimeByRow: Record<number, string> = {};
    const columnADateByRow: Record<number, string> = {};
    const columnATimeByRow: Record<number, string> = {};
    const fillKeyByRow: Record<number, string> = {};

    for (let r = range.s.r; r <= range.e.r; r++) {
      const directCell = getDirectSheetCell(sheet, r, firstCol);
      const mergedCell = resolveSheetCell(sheet, merges, r, firstCol);
      const styleCell = mergedCell || directCell;
      fillKeyByRow[r] = getCellFillKey(styleCell);

      const parsed = parseDateVal(directCell?.v, directCell?.w);
      if (parsed) explicitDateByRow[r] = parsed;

      // Column A is the source of truth. If the row is inside a merged date/time
      // header, read the merged master directly so same-day blocks keep their
      // own start hour (e.g. 07/06 08:00 and 07/06 13:00).
      const rowDateFromColumnA = parseDateVal(mergedCell?.v, mergedCell?.w);
      const rowTimeFromColumnA = parseTimeVal(mergedCell?.v, mergedCell?.w);
      if (rowDateFromColumnA) columnADateByRow[r] = rowDateFromColumnA;
      if (rowTimeFromColumnA) columnATimeByRow[r] = rowTimeFromColumnA;

      // Time may live in the same cell text (e.g. "17/05/2026 08:00") or in
      // the merged master when this row is a slave.
      const timeFromDirect = parseTimeVal(directCell?.v, directCell?.w);
      const timeFromMerged = timeFromDirect || parseTimeVal(mergedCell?.v, mergedCell?.w);
      if (timeFromMerged) explicitTimeByRow[r] = timeFromMerged;
    }

    const dateByRow: Record<number, string> = { ...columnADateByRow };
    const timeByRow: Record<number, string> = { ...columnATimeByRow };

    // Build "block boundaries" using merges in column A. Each merged range in
    // column A (or contiguous span between explicit date rows) is one shift
    // block with its own date + start time. This separates same-day blocks
    // like 08:00 and 13:00 on Sunday 07/06 which share the same fill colour.
    const colAMerges = merges
      .filter(m => m.s.c <= firstCol && m.e.c >= firstCol)
      .sort((a, b) => a.s.r - b.s.r);

    const findMergeFor = (row: number): XLSX.Range | null => {
      for (const m of colAMerges) {
        if (row >= m.s.r && row <= m.e.r) return m;
      }
      return null;
    };

    const isWeekdayLabelRow = (row: number): boolean => {
      const cell = getDirectSheetCell(sheet, row, firstCol);
      const text = String(cell?.w ?? cell?.v ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
      return /^(segunda|terca|quarta|quinta|sexta|sabado|domingo)$/.test(text);
    };

    const explicitRows = Object.keys(explicitDateByRow)
      .map(Number)
      .sort((a, b) => a - b);

    for (let i = 0; i < explicitRows.length; i++) {
      const row = explicitRows[i];
      const parsedDate = explicitDateByRow[row];
      const fillKey = fillKeyByRow[row];

      // Determine block extent:
      //  1) If column A is merged at this row, use the merge's row span.
      //  2) Otherwise, walk up/down stopping at next explicit date row OR a
      //     different fill colour.
      let blockStart = row;
      let blockEnd = row;
      const merge = findMergeFor(row);
      if (merge) {
        blockStart = merge.s.r;
        blockEnd = merge.e.r;
      } else {
        // In the current Excel layout each service block is:
        // weekday row -> date row -> start/"às"/end rows. Column A often is
        // visually merged by colour, not by real Excel merges, so split blocks
        // at the weekday row before the next explicit date. This keeps same-day
        // services separated: 08:00, 13:00, 19:30, etc.
        if (row > range.s.r && isWeekdayLabelRow(row - 1)) {
          blockStart = row - 1;
        }

        const nextExplicitRow = explicitRows[i + 1];
        if (nextExplicitRow !== undefined) {
          const nextHeaderRow = nextExplicitRow - 1;
          const endBeforeNextBlock = isWeekdayLabelRow(nextHeaderRow)
            ? nextExplicitRow - 2
            : nextExplicitRow - 1;
          blockEnd = Math.max(row, endBeforeNextBlock);
        } else {
          for (let r = row + 1; r <= range.e.r; r++) {
            if (isWeekdayLabelRow(r) || explicitDateByRow[r]) break;
            const m = findMergeFor(r);
            if (m) break;
            if (fillKey && fillKeyByRow[r] !== fillKey) break;
            blockEnd = r;
          }
        }
      }

      const blockRows: number[] = [];
      for (let r = blockStart; r <= blockEnd; r++) blockRows.push(r);

      // The block's start time = earliest time cell found in column A within
      // the block (e.g. "08:00H" in a "Domingo / 07/06/26 / 08:00H / às /
      // 13:00H" header). Falls back to the time on the date row itself.
      let blockTime = explicitTimeByRow[row] || '';
      if (!blockTime) {
        const timesInBlock = blockRows
          .filter(r => explicitTimeByRow[r])
          .sort((a, b) => a - b);
        if (timesInBlock.length > 0) blockTime = explicitTimeByRow[timesInBlock[0]];
      }

      for (const r of blockRows) {
        dateByRow[r] = parsedDate;
        if (blockTime) timeByRow[r] = blockTime;
      }
    }

    // Forward fill ONLY the date (so service rows after a header still know
    // their date). Do NOT forward-fill the time across block boundaries — a
    // missing time means the row was outside any header block and should
    // remain blank rather than inherit the previous block's time.
    let lastKnown = '';
    for (let r = range.s.r; r <= range.e.r; r++) {
      if (dateByRow[r]) {
        lastKnown = dateByRow[r];
      } else if (lastKnown) {
        dateByRow[r] = lastKnown;
      }
    }
    let nextKnown = '';
    for (let r = range.e.r; r >= range.s.r; r--) {
      if (dateByRow[r]) {
        nextKnown = dateByRow[r];
      } else if (nextKnown) {
        dateByRow[r] = nextKnown;
      }
    }

    // Resolve cell value through merges
    const resolveCellValue = (row: number, col: number): string => {
      const cell = resolveSheetCell(sheet, merges, row, col);
      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
        if (cell.t === 'e') return '';
        if (cell.w !== undefined && cell.w !== null && cell.w !== '') return String(cell.w).trim();
        return String(cell.v).trim();
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
    const cellGrayByKey = new Map<string, boolean>();

    // First pass: collect all original mech cells from XLSX
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const val = resolveCellValue(r, c);
        if (!val) continue;
        const mk = normalizeMechKey(val);
        if (mk && usersByMech.has(mk)) {
          const key = `${r},${c}`;
          cellMechByKey.set(key, mk);
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = (sheet as any)[addr];
          cellGrayByKey.set(key, isCellGray(cell));
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
      const [rs, cs] = key.split(',').map(Number);
      const origVal = normalizeMechKey(resolveCellValue(rs, cs));
      const isModified = origVal !== mechKey;
      const isGray = cellGrayByKey.get(key) || false;

      if (!result[mechKey]) result[mechKey] = [];
      result[mechKey].push({
        date: rowDate,
        dateISO: iso,
        startTime: timeByRow[r] || undefined,
        mechanographicNumber: userInfo.mech,
        name: userInfo.name,
        isModified,
        isGray,
      });
    }

    // Sort
    for (const k of Object.keys(result)) {
      result[k].sort((a, b) => {
        const cmp = a.dateISO.localeCompare(b.dateISO);
        if (cmp !== 0) return cmp;
        const timeCmp = (a.startTime || '99:99').localeCompare(b.startTime || '99:99');
        if (timeCmp !== 0) return timeCmp;
        // Day entries before gray (pernoite) entries within same date
        return (a.isGray ? 1 : 0) - (b.isGray ? 1 : 0);
      });
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
