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
  isGray: boolean;
  isHeader: boolean;
  isMergedSlave: boolean; // cell covered by a merge (hidden)
  mergeRowSpan?: number;
  mergeColSpan?: number;
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

const UpdatedSchedule: React.FC = () => {
  const [grid, setGrid] = useState<ExcelCell[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exchanges, setExchanges] = useState<AcceptedExchange[]>([]);
  const [modifiedCells, setModifiedCells] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load accepted exchanges and XLSX in parallel
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

    const totalRows = range.e.r - range.s.r + 1;
    const totalCols = range.e.c - range.s.c + 1;

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

    // Helper: check gray fill
    const isCellGray = (cell: any): boolean => {
      if (!cell?.s) return false;
      const style = cell.s;
      const extractRgb = (color: any) => {
        if (!color) return null;
        const hex = typeof color === 'string' ? color : color.rgb;
        if (!hex || typeof hex !== 'string') return null;
        const clean = hex.replace(/^#/, '').toUpperCase();
        const rgbHex = clean.length === 8 ? clean.slice(2) : clean.length === 6 ? clean : '';
        if (rgbHex.length !== 6) return null;
        const r = parseInt(rgbHex.slice(0, 2), 16);
        const g = parseInt(rgbHex.slice(2, 4), 16);
        const b = parseInt(rgbHex.slice(4, 6), 16);
        if (isNaN(r)) return null;
        return { r, g, b };
      };
      const isGrayish = (c: { r: number; g: number; b: number }) => {
        const delta = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
        return delta <= 20 && Math.max(c.r, c.g, c.b) >= 40 && Math.max(c.r, c.g, c.b) <= 245;
      };
      const rgb = extractRgb(style.fgColor) || extractRgb(style.bgColor) || extractRgb(style.fill?.fgColor) || extractRgb(style.fill?.bgColor);
      if (rgb) return isGrayish(rgb);
      // Fallback for theme fills
      const hasTheme = [style.fgColor, style.bgColor, style.fill?.fgColor, style.fill?.bgColor]
        .some(c => c && (c.theme !== undefined || c.indexed !== undefined));
      if (hasTheme && (style.patternType ?? style.fill?.patternType) !== 'none') return true;
      return false;
    };

    // Build date mapping from column A for exchange matching
    const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
    const pad2 = (n: number) => String(n).padStart(2, '0');
    
    // Detect header month/year
    let headerMonth: number | undefined;
    let headerYear: number | undefined;
    const monthMap: Record<string, number> = {
      'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3, 'abril': 4, 'maio': 5,
      'junho': 6, 'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
    };

    // Scan first rows for month/year
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

    // Build date by row from col A
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

    // Build user lookup: email -> {name, mech_number}
    const { data: usersData } = await supabase.from('users').select('email, name, mechanographic_number');
    const usersByEmail = new Map<string, { name: string; mech: string }>();
    const usersByMech = new Map<string, { email: string; name: string }>();
    for (const u of (usersData || [])) {
      usersByEmail.set(u.email, { name: u.name, mech: u.mechanographic_number });
      usersByMech.set(u.mechanographic_number, { email: u.email, name: u.name });
    }

    // Convert exchange dates (YYYY-MM-DD) to PT format (DD/MM/YYYY)
    const toExcelDate = (isoDate: string): string => {
      if (!isoDate) return '';
      const parts = isoDate.split('-');
      if (parts.length !== 3) return isoDate;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    // Build grid and apply exchanges
    const newModified = new Set<string>();
    const resultGrid: ExcelCell[][] = [];

    for (let r = range.s.r; r <= range.e.r; r++) {
      const rowCells: ExcelCell[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const key = `${r},${c}`;
        const mergeInfo = mergeMap.get(key);
        
        if (mergeInfo && !mergeInfo.master) {
          rowCells.push({ value: null, isGray: false, isHeader: false, isMergedSlave: true });
          continue;
        }

        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = (sheet as any)[addr];
        let displayValue = cell?.w || (cell?.v !== undefined && cell?.v !== null ? String(cell.v) : '');
        const gray = isCellGray(cell);
        const isHeader = r <= range.s.r + 2; // First 3 rows as headers

        // Check if this cell contains a mech number that should be swapped
        const cellStr = String(displayValue).trim();
        const rowDate = dateByRow[r];
        
        if (rowDate && cellStr && !isHeader) {
          const userInfo = usersByMech.get(cellStr);
          if (userInfo) {
            // Check if there's an accepted exchange affecting this cell
            for (const ex of acceptedExchanges) {
              const exReqDate = toExcelDate(ex.requested_date);
              const exOffDate = toExcelDate(ex.offered_date);
              
              // If this cell shows the requester on the requested_date, swap to target
              if (rowDate === exReqDate && userInfo.email === ex.requester_email) {
                const targetInfo = usersByEmail.get(ex.target_email);
                if (targetInfo) {
                  displayValue = targetInfo.mech;
                  newModified.add(`${r - range.s.r},${c - range.s.c}`);
                }
              }
              // If this cell shows the target on the offered_date, swap to requester
              if (exOffDate && rowDate === exOffDate && userInfo.email === ex.target_email) {
                const reqInfo = usersByEmail.get(ex.requester_email);
                if (reqInfo) {
                  displayValue = reqInfo.mech;
                  newModified.add(`${r - range.s.r},${c - range.s.c}`);
                }
              }
            }
          }

          // Also check name cells (column after mech number might have the name)
          // Check if cell contains a user name
          const userByName = Array.from(usersByEmail.entries()).find(([, info]) => 
            info.name.toLowerCase() === cellStr.toLowerCase()
          );
          if (userByName) {
            const [email] = userByName;
            for (const ex of acceptedExchanges) {
              const exReqDate = toExcelDate(ex.requested_date);
              const exOffDate = toExcelDate(ex.offered_date);
              
              if (rowDate === exReqDate && email === ex.requester_email) {
                displayValue = ex.target_name;
                newModified.add(`${r - range.s.r},${c - range.s.c}`);
              }
              if (exOffDate && rowDate === exOffDate && email === ex.target_email) {
                displayValue = ex.requester_name;
                newModified.add(`${r - range.s.r},${c - range.s.c}`);
              }
            }
          }
        }

        rowCells.push({
          value: displayValue,
          isGray: gray,
          isHeader,
          isMergedSlave: false,
          mergeRowSpan: mergeInfo?.rowSpan,
          mergeColSpan: mergeInfo?.colSpan,
        });
      }
      resultGrid.push(rowCells);
    }

    setModifiedCells(newModified);
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
            <div className="mt-2 text-sm text-muted-foreground">
              {exchanges.length} troca(s) aceite(s) aplicada(s). Células modificadas destacadas em{' '}
              <span className="inline-block w-3 h-3 bg-green-200 border border-green-400 rounded-sm align-middle" />.
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
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {grid.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => {
                        if (cell.isMergedSlave) return null;
                        const isModified = modifiedCells.has(`${ri},${ci}`);
                        const Tag = cell.isHeader ? 'th' : 'td';
                        return (
                          <Tag
                            key={ci}
                            rowSpan={cell.mergeRowSpan || undefined}
                            colSpan={cell.mergeColSpan || undefined}
                            className={`
                              border border-gray-300 px-1.5 py-1 whitespace-nowrap
                              ${cell.isHeader ? 'bg-gray-100 font-semibold text-center sticky top-0 z-10' : ''}
                              ${cell.isGray && !cell.isHeader ? 'bg-blue-100' : ''}
                              ${isModified ? 'bg-green-200 border-green-400 font-bold' : ''}
                            `}
                            title={isModified ? 'Alterado por troca aceite' : undefined}
                          >
                            {cell.value || ''}
                          </Tag>
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
