import { systemSettingsService } from "@/services/supabase/systemSettingsService";
import * as XLSX from 'xlsx';

export interface ParsedServiceDate {
  date: string; // DD/MM/YYYY format
  dateISO: string; // YYYY-MM-DD format for date inputs
}

// Cache to avoid re-parsing the same XLSX
let cachedDates: Record<string, ParsedServiceDate[]> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;

const normalizeDateStr = (dateStr: string): string => {
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (year.length === 2) {
      const yearNum = parseInt(year, 10);
      const fullYear = yearNum >= 0 && yearNum <= 50 ? `20${year}` : `19${year}`;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${fullYear}`;
    }
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateStr;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

const ptDateToISO = (ptDate: string): string => {
  const parts = ptDate.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return '';
};

/**
 * Parse the XLSX schedule and return all service dates grouped by mechanographic number.
 */
export const parseScheduleXlsx = async (): Promise<Record<string, ParsedServiceDate[]>> => {
  // Check cache
  if (cachedDates && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedDates;
  }

  const xlsxUrl = await systemSettingsService.getSystemSetting('schedule_xlsx_link');
  if (!xlsxUrl) {
    console.log('No XLSX configured');
    return {};
  }

  try {
    const response = await fetch(xlsxUrl, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error(`Failed to fetch XLSX: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true, cellNF: true, cellDates: false });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, blankrows: true, raw: true }) as any[][];

    const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1');
    const startRow = range.s.r;
    const endRow = range.e.r;

    // Detect header month/year
    const monthMap: Record<string, number> = {
      'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3, 'abril': 4, 'maio': 5,
      'junho': 6, 'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
    };
    let headerMonth: number | undefined;
    let headerYear: number | undefined;

    for (let i = 0; i < Math.min(100, jsonData.length); i++) {
      const row = jsonData[i] || [];
      for (const cell of row) {
        if (cell === null || cell === undefined) continue;
        if (typeof cell === 'string') {
          const s = cell.toLowerCase();
          for (const [mName, mNum] of Object.entries(monthMap)) {
            if (s.includes(mName)) headerMonth = headerMonth ?? mNum;
          }
          const yearMatch = s.match(/\b(20\d{2})\b/);
          if (yearMatch) headerYear = headerYear ?? parseInt(yearMatch[1], 10);
        } else if (typeof cell === 'number') {
          if (cell > 40000 && cell < 60000) {
            const dc = XLSX.SSF.parse_date_code(cell);
            if (dc) {
              headerMonth = headerMonth ?? dc.m;
              headerYear = headerYear ?? dc.y;
            }
          } else if (cell >= 2020 && cell <= 2035) {
            headerYear = headerYear ?? cell;
          }
        }
      }
    }

    // Build date map from column A
    const merges: any[] = (firstSheet['!merges'] || []) as any[];
    const dateByAbsRow: Record<number, string> = {};

    const parseDateFromAny = (val: any, cellAddr?: string, formattedText?: string): string => {
      if (val === null || val === undefined || val === '') return '';
      if (typeof val === 'string' && val.trim() === '') return '';

      if (formattedText && typeof formattedText === 'string') {
        const m = formattedText.match(datePattern);
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

    // Propagate dates from merged cells in column A
    for (const m of merges) {
      if (m.s.c === 0 && m.e.c === 0) {
        const topAddr = XLSX.utils.encode_cell({ r: m.s.r, c: 0 });
        const topCell = (firstSheet as any)[topAddr];
        const parsed = parseDateFromAny(topCell?.v, topAddr, topCell?.w);
        if (parsed) {
          for (let r = m.s.r; r <= m.e.r; r++) dateByAbsRow[r] = parsed;
        }
      }
    }

    // Non-merged rows
    for (let rAbs = startRow; rAbs <= endRow; rAbs++) {
      if (dateByAbsRow[rAbs]) continue;
      const addr = XLSX.utils.encode_cell({ r: rAbs, c: 0 });
      const cell = (firstSheet as any)[addr];
      const parsed = parseDateFromAny(cell?.v, addr, cell?.w);
      if (parsed) dateByAbsRow[rAbs] = parsed;
    }

    // Now scan all rows to find mechanographic numbers and map them to dates
    const result: Record<string, ParsedServiceDate[]> = {};
    
    // Collect all mechanographic numbers we know about
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] || [];
      if (row.length === 0) continue;

      const sheetRow = startRow + i;

      // Look for cells that look like mechanographic numbers (numeric strings, typically 4-8 digits)
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (cell === null || cell === undefined) continue;
        const cellStr = String(cell).trim();
        // Skip if not a plausible mech number
        if (!/^\d{3,8}$/.test(cellStr)) continue;

        let foundDate = dateByAbsRow[sheetRow] || '';

        // Fallback: look up in column A
        if (!foundDate) {
          const addrA = XLSX.utils.encode_cell({ r: sheetRow, c: 0 });
          const cellA = (firstSheet as any)[addrA];
          foundDate = parseDateFromAny(cellA?.v, addrA, cellA?.w);
        }

        // Fallback: search upward
        if (!foundDate) {
          for (let upAbs = sheetRow - 1; upAbs >= Math.max(startRow, sheetRow - 20); upAbs--) {
            const addrUp = XLSX.utils.encode_cell({ r: upAbs, c: 0 });
            const cellUp = (firstSheet as any)[addrUp];
            const parsedUp = parseDateFromAny(cellUp?.v, addrUp, cellUp?.w);
            if (parsedUp) { foundDate = parsedUp; break; }
          }
        }

        if (foundDate) {
          const iso = ptDateToISO(foundDate);
          if (iso) {
            if (!result[cellStr]) result[cellStr] = [];
            // Avoid duplicates
            if (!result[cellStr].some(d => d.dateISO === iso)) {
              result[cellStr].push({ date: foundDate, dateISO: iso });
            }
          }
        }
      }
    }

    // Sort dates for each user
    for (const key of Object.keys(result)) {
      result[key].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    }

    // Cache results
    cachedDates = result;
    cacheTimestamp = Date.now();

    console.log('Schedule parsing complete. Users found:', Object.keys(result).length);
    return result;
  } catch (error) {
    console.error('Error parsing schedule XLSX:', error);
    return {};
  }
};

/**
 * Get service dates for a specific mechanographic number.
 */
export const getServiceDatesForUser = async (mechNumber: string): Promise<ParsedServiceDate[]> => {
  const allDates = await parseScheduleXlsx();
  return allDates[mechNumber] || [];
};

/**
 * Clear the cache (e.g., when schedule is updated).
 */
export const clearScheduleCache = () => {
  cachedDates = null;
  cacheTimestamp = 0;
};
