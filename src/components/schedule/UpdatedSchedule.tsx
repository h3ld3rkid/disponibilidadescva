import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { systemSettingsService } from "@/services/supabase/systemSettingsService";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';

interface ExcelCell {
  value: any;
  bgColor: string | null; // actual CSS color from Excel
  fontColor: string | null;
  fontBold: boolean;
  isMergedSlave: boolean;
  mergeRowSpan?: number;
  mergeColSpan?: number;
  isModified?: boolean;
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
}

// Columns to hide (0-indexed from sheet start): D=3, G=6
const HIDDEN_COLS = new Set([3, 6]);

const UpdatedSchedule: React.FC = () => {
  const [grid, setGrid] = useState<ExcelCell[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exchanges, setExchanges] = useState<AcceptedExchange[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [exchangeResult, xlsxUrl] = await Promise.all([
        supabase
          .from('shift_exchange_requests')
          .select('*')
          .eq('status', 'accepted')
          .order('responded_at', { ascending: false }),
        systemSettingsService.getSystemSetting('schedule_xlsx_link'),
      ]);

      if (exchangeResult.error) {
        console.error('Error loading exchanges:', exchangeResult.error);
      }
      const acceptedExchanges = (exchangeResult.data || []) as AcceptedExchange[];
      setExchanges(acceptedExchanges);

      if (!xlsxUrl) {
        setError('Nenhuma escala XLSX configurada. O administrador precisa configurar o link XLSX.');
        setIsLoading(false);
        return;
      }

      await parseAndRenderXlsx(xlsxUrl, acceptedExchanges);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const parseAndRenderXlsx = async (xlsxUrl: string, acceptedExchanges: AcceptedExchange[]) => {
    const response = await fetch(xlsxUrl, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error(`Erro ao carregar XLSX: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true, cellNF: true, cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const merges: XLSX.Range[] = (sheet['!merges'] || []) as XLSX.Range[];

    // Build merge map
    const mergeMap = new Map<string, { master: boolean; rowSpan: number; colSpan: number }>();
    for (const m of merges) {
      const rowSpan = m.e.r - m.s.r + 1;
      const colSpan = m.e.c - m.s.c + 1;
      for (let r = m.s.r; r <= m.e.r; r++) {
        for (let c = m.s.c; c <= m.e.c; c++) {
          const key = `${r},${c}`;
          if (r === m.s.r && c === m.s.c) {
            mergeMap.set(key, { master: true, rowSpan, colSpan });
          } else {
            mergeMap.set(key, { master: false, rowSpan: 0, colSpan: 0 });
          }
        }
      }
    }

    // Extract actual cell background color as CSS
    const getCellBgColor = (cell: any): string | null => {
      if (!cell?.s) return null;
      const style = cell.s;
      
      const hexToRgb = (hex: string): string | null => {
        if (!hex || typeof hex !== 'string') return null;
        const clean = hex.replace(/^#/, '').toUpperCase();
        const rgbHex = clean.length === 8 ? clean.slice(2) : clean.length === 6 ? clean : '';
        if (rgbHex.length !== 6) return null;
        const r = parseInt(rgbHex.slice(0, 2), 16);
        const g = parseInt(rgbHex.slice(2, 4), 16);
        const b = parseInt(rgbHex.slice(4, 6), 16);
        if (isNaN(r)) return null;
        return `rgb(${r},${g},${b})`;
      };

      const extractColor = (color: any): string | null => {
        if (!color) return null;
        if (typeof color === 'string') return hexToRgb(color);
        if (typeof color.rgb === 'string') return hexToRgb(color.rgb);
        return null;
      };

      // Try fgColor first (Excel uses fgColor for solid fills)
      const fg = extractColor(style.fgColor) || extractColor(style.fill?.fgColor);
      if (fg) return fg;
      const bg = extractColor(style.bgColor) || extractColor(style.fill?.bgColor);
      if (bg) return bg;

      // Theme/indexed fallback - only apply when we can resolve the actual color
      const hasFill = [style.fgColor, style.bgColor, style.fill?.fgColor, style.fill?.bgColor]
        .some(c => c && (c.theme !== undefined || c.indexed !== undefined));
      if (hasFill && (style.patternType ?? style.fill?.patternType) !== 'none') {
        const indexed = style.fgColor?.indexed ?? style.fill?.fgColor?.indexed ?? 
                       style.bgColor?.indexed ?? style.fill?.bgColor?.indexed;
        // Excel indexed colors
        if (indexed === 22) return 'rgb(192,192,192)';
        if (indexed === 23) return 'rgb(128,128,128)';
        if (indexed === 55) return 'rgb(153,153,153)';
        if (indexed === 9 || indexed === 64) return null; // white / auto = no fill
        
        const theme = style.fgColor?.theme ?? style.fill?.fgColor?.theme;
        const tint = style.fgColor?.tint ?? style.fill?.fgColor?.tint;
        
        // Theme 0 = white base, theme 1 = black base
        if (theme === 0 && !tint) return null; // Pure white = no fill
        if (theme === 0 && tint && tint < 0) {
          const gray = Math.round(255 * (1 + tint));
          return `rgb(${gray},${gray},${gray})`;
        }
        if (theme === 1 && tint && tint > 0) {
          const gray = Math.round(255 * tint);
          return `rgb(${gray},${gray},${gray})`;
        }
        // Don't apply generic fallback - return null to avoid coloring white cells gray
        return null;
      }

      return null;
    };

    const getCellFontColor = (cell: any): string | null => {
      if (!cell?.s?.font?.color) return null;
      const color = cell.s.font.color;
      if (typeof color.rgb === 'string') {
        const clean = color.rgb.replace(/^#/, '');
        const rgbHex = clean.length === 8 ? clean.slice(2) : clean;
        if (rgbHex.length === 6) {
          const r = parseInt(rgbHex.slice(0, 2), 16);
          const g = parseInt(rgbHex.slice(2, 4), 16);
          const b = parseInt(rgbHex.slice(4, 6), 16);
          return `rgb(${r},${g},${b})`;
        }
      }
      return null;
    };

    const isCellBold = (cell: any): boolean => {
      return cell?.s?.font?.bold === true;
    };

    // Date parsing helpers
    const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
    const pad2 = (n: number) => String(n).padStart(2, '0');
    
    let headerMonth: number | undefined;
    let headerYear: number | undefined;
    const monthMap: Record<string, number> = {
      'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3, 'abril': 4, 'maio': 5,
      'junho': 6, 'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
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
            if (dc) { headerMonth = headerMonth ?? dc.m; headerYear = headerYear ?? dc.y; }
          }
        }
      }
    }

    const dateByRow: Record<number, string> = {};
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

    // Propagate merged dates
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

    // Find first row with a date, then include the header row above it (DIA, Nº, etc.)
    let firstDateRow = range.s.r;
    for (let r = range.s.r; r <= range.e.r; r++) {
      if (dateByRow[r]) {
        firstDateRow = r;
        break;
      }
    }
    // Include the header row just above the first date row (DIA, Nº, Nome, etc.)
    const startRow = firstDateRow > range.s.r ? firstDateRow - 1 : firstDateRow;
    console.log('Header row:', startRow, 'First date row:', firstDateRow, 'Date:', dateByRow[firstDateRow]);

    // Build user lookup
    const { data: usersData } = await supabase.from('users').select('email, name, mechanographic_number');
    const usersByEmail = new Map<string, { name: string; mech: string }>();
    const usersByMech = new Map<string, { email: string; name: string }>();
    for (const u of (usersData || [])) {
      usersByEmail.set(u.email, { name: u.name, mech: u.mechanographic_number });
      usersByMech.set(u.mechanographic_number, { email: u.email, name: u.name });
    }

    const toExcelDate = (isoDate: string): string => {
      if (!isoDate) return '';
      const parts = isoDate.split('-');
      if (parts.length !== 3) return isoDate;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    // Build adjusted merge map for visible rows (startRow onwards)
    // Merges that start before startRow need adjustment
    const visibleMergeMap = new Map<string, { master: boolean; rowSpan: number; colSpan: number }>();
    for (const m of merges) {
      const effectiveStartR = Math.max(m.s.r, startRow);
      const rowSpan = m.e.r - effectiveStartR + 1;
      if (rowSpan <= 0) continue; // entire merge is above visible area
      const colSpan = m.e.c - m.s.c + 1;
      
      for (let r = effectiveStartR; r <= m.e.r; r++) {
        for (let c = m.s.c; c <= m.e.c; c++) {
          const key = `${r},${c}`;
          if (r === effectiveStartR && c === m.s.c) {
            // This is the visible master
            visibleMergeMap.set(key, { master: true, rowSpan, colSpan });
          } else {
            visibleMergeMap.set(key, { master: false, rowSpan: 0, colSpan: 0 });
          }
        }
      }
    }

    // Build grid starting from startRow, skipping hidden columns
    const resultGrid: ExcelCell[][] = [];

    for (let r = startRow; r <= range.e.r; r++) {
      const rowCells: ExcelCell[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const colIdx = c - range.s.c;
        if (HIDDEN_COLS.has(colIdx)) continue;

        const key = `${r},${c}`;
        const mergeInfo = visibleMergeMap.get(key);
        
        if (mergeInfo && !mergeInfo.master) {
          rowCells.push({ value: null, bgColor: null, fontColor: null, fontBold: false, isMergedSlave: true });
          continue;
        }

        // For visible masters that were originally merge slaves (master was above startRow),
        // read cell value from the original master cell
        let addr = XLSX.utils.encode_cell({ r, c });
        let cell = (sheet as any)[addr];
        
        // If this cell is empty and it's a visible merge master, find the original master
        if (mergeInfo?.master && (!cell || cell.v === undefined || cell.v === null)) {
          // Find the original merge that contains this cell
          for (const m of merges) {
            if (r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c) {
              const origAddr = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
              const origCell = (sheet as any)[origAddr];
              if (origCell) { cell = origCell; break; }
            }
          }
        }
        
        let displayValue = cell?.w || (cell?.v !== undefined && cell?.v !== null ? String(cell.v) : '');
        const bgColor = getCellBgColor(cell);
        const fontColor = getCellFontColor(cell);
        const fontBold = isCellBold(cell);

        // Apply exchange swaps
        let isModified = false;
        const cellStr = String(displayValue).trim();
        const rowDate = dateByRow[r];
        
        if (rowDate && cellStr) {
          const userInfo = usersByMech.get(cellStr);
          if (userInfo) {
            for (const ex of acceptedExchanges) {
              const exReqDate = toExcelDate(ex.requested_date);
              const exOffDate = toExcelDate(ex.offered_date);
              
              if (rowDate === exReqDate && userInfo.email === ex.requester_email) {
                const targetInfo = usersByEmail.get(ex.target_email);
                if (targetInfo) { displayValue = targetInfo.mech; isModified = true; }
              }
              if (exOffDate && rowDate === exOffDate && userInfo.email === ex.target_email) {
                const reqInfo = usersByEmail.get(ex.requester_email);
                if (reqInfo) { displayValue = reqInfo.mech; isModified = true; }
              }
            }
          }

          const userByName = Array.from(usersByEmail.entries()).find(([, info]) => 
            info.name.toLowerCase() === cellStr.toLowerCase()
          );
          if (userByName) {
            const [email] = userByName;
            for (const ex of acceptedExchanges) {
              const exReqDate = toExcelDate(ex.requested_date);
              const exOffDate = toExcelDate(ex.offered_date);
              
              if (rowDate === exReqDate && email === ex.requester_email) {
                displayValue = ex.target_name; isModified = true;
              }
              if (exOffDate && rowDate === exOffDate && email === ex.target_email) {
                displayValue = ex.requester_name; isModified = true;
              }
            }
          }
        }

        // Adjust merge spans for hidden columns
        let adjustedColSpan = mergeInfo?.colSpan;
        if (mergeInfo?.master && adjustedColSpan && adjustedColSpan > 1) {
          let hidden = 0;
          for (let cc = c; cc < c + mergeInfo.colSpan; cc++) {
            if (HIDDEN_COLS.has(cc - range.s.c)) hidden++;
          }
          adjustedColSpan = adjustedColSpan - hidden;
          if (adjustedColSpan < 1) adjustedColSpan = 1;
        }

        rowCells.push({
          value: displayValue,
          bgColor,
          fontColor,
          fontBold,
          isMergedSlave: false,
          mergeRowSpan: mergeInfo?.rowSpan,
          mergeColSpan: adjustedColSpan,
          isModified,
        });
      }
      resultGrid.push(rowCells);
    }

    setGrid(resultGrid);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6" />
                Escala Atualizada
              </CardTitle>
              <CardDescription>
                Escala com as trocas aceites já refletidas
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
          {exchanges.length > 0 && (
            <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1.5">
              {exchanges.length} troca(s) aceite(s) aplicada(s). Células modificadas:{' '}
              <span className="inline-block w-3 h-3 rounded-sm align-middle" style={{ backgroundColor: '#c6efce', border: '1px solid #006100' }} />
            </div>
          )}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">A carregar e processar escala...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-destructive mb-2">{error}</div>
              <p className="text-sm text-muted-foreground">
                Se o problema persistir, contacte o administrador.
              </p>
            </div>
          ) : grid.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum dado disponível.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <table className="w-full text-xs border-collapse" style={{ borderSpacing: 0 }}>
                <tbody>
                  {grid.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => {
                        if (cell.isMergedSlave) return null;
                        
                        const isMergedVertical = (cell.mergeRowSpan || 1) > 1;
                        const cellStyle: React.CSSProperties = {
                          backgroundColor: cell.isModified 
                            ? '#c6efce' 
                            : cell.bgColor || undefined,
                          color: cell.fontColor || undefined,
                          fontWeight: cell.fontBold ? 'bold' : undefined,
                          border: cell.isModified 
                            ? '2px solid #006100' 
                            : '1px solid #d0d0d0',
                          padding: '2px 4px',
                          whiteSpace: 'nowrap',
                          fontSize: '11px',
                          verticalAlign: isMergedVertical ? 'middle' : undefined,
                          textAlign: isMergedVertical ? 'center' : undefined,
                        };

                        return (
                          <td
                            key={ci}
                            rowSpan={cell.mergeRowSpan || undefined}
                            colSpan={cell.mergeColSpan || undefined}
                            style={cellStyle}
                            title={cell.isModified ? 'Alterado por troca aceite' : undefined}
                          >
                            {cell.value || ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdatedSchedule;
