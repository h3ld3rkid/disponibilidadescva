import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { systemSettingsService } from "@/services/supabase/systemSettingsService";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CalendarDays } from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as XLSX from 'xlsx';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface ServiceEntry {
  date: string;
  mechanographicNumber: string;
  rawText: string;
  isGray?: boolean;
}

interface MyServicesProps {
  userMechanographicNumber?: string;
}

const MyServices: React.FC<MyServicesProps> = ({ userMechanographicNumber }) => {
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadScheduleData();
  }, [userMechanographicNumber]);

  const loadScheduleData = async () => {
    // Check if XLSX is configured first (preferred)
    const xlsxUrl = await systemSettingsService.getSystemSetting('schedule_xlsx_link');
    
    if (xlsxUrl) {
      console.log('XLSX configured, using Excel parsing');
      await loadAndParseXlsx();
    } else {
      console.log('No XLSX configured, falling back to PDF parsing');
      await loadAndParsePdf();
    }
  };

  const loadAndParseXlsx = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get user info to find mechanographic number
      const storedUser = localStorage.getItem('mysqlConnection');
      if (!storedUser) {
        throw new Error('Utilizador não encontrado');
      }
      
      const userInfo = JSON.parse(storedUser);
      const mechNumber = userMechanographicNumber || userInfo.mechanographic_number;
      
      if (!mechNumber) {
        throw new Error('Número mecanográfico não encontrado');
      }

      // Get XLSX URL from system settings
      const xlsxUrl = await systemSettingsService.getSystemSetting('schedule_xlsx_link');
      
      if (!xlsxUrl) {
        setError('Nenhuma escala XLSX disponível');
        setIsLoading(false);
        return;
      }

      console.log('Fetching XLSX from:', xlsxUrl);

      // Fetch the XLSX file
      const response = await fetch(xlsxUrl, {
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`Erro ao carregar ficheiro XLSX: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      // Read with cellStyles to preserve formatting
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array', 
        cellStyles: true,
        cellNF: true,
        cellDates: false // Keep as serial numbers to get proper formatting
      });
      
      // Get the first sheet
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, blankrows: true, raw: true }) as any[][];;
      
      console.log('XLSX loaded, rows:', jsonData.length);
      console.log('First 5 rows:', jsonData.slice(0, 5));

      const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1');
      const startRow = range.s.r; // 0-based sheet start row
      const endRow = range.e.r;

      const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
      
      // Normalize 2-digit years to 4-digit (e.g., 25 -> 2025, 99 -> 1999)
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

      // Heurística para detetar Mês/Ano no topo (necessário para dias sem mês)
      const monthMap: Record<string, number> = {
        'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3, 'abril': 4, 'maio': 5,
        'junho': 6, 'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
      };
      let headerMonth: number | undefined;
      let headerYear: number | undefined;

      const excelSerialToDate = (serial: number) => {
        // Excel (1900-date system) -> JS Date
        const ms = Math.round((serial - 25569) * 86400 * 1000);
        return new Date(ms);
      };
      const pad2 = (n: number) => String(n).padStart(2, '0');
      const toPtDate = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

      // Procurar mês e ano nas primeiras 100 linhas
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

      console.log('Header month/year detected:', { headerMonth, headerYear });

      // Mapear datas da Coluna A considerando células mescladas
      const merges: any[] = (firstSheet['!merges'] || []) as any[];
      const dateByAbsRow: Record<number, string> = {};

      const parseDateFromAny = (val: any, cellAddr?: string, formattedText?: string): string => {
        if (val === null || val === undefined || val === '') return '';
        // Ignore empty strings or whitespace
        if (typeof val === 'string' && val.trim() === '') return '';
        
        console.log(`🔍 Parsing date at ${cellAddr}:`, { 
          val, 
          formattedText, 
          valType: typeof val,
          formattedType: typeof formattedText 
        });
        
        // PRIORITY 1: Use formatted text (cell.w) if available - this is what user sees!
        if (formattedText && typeof formattedText === 'string') {
          const m = formattedText.match(datePattern);
          if (m) {
            const normalized = normalizeDateStr(m[1]);
            console.log(`✅ Parsed formatted text "${formattedText}" at ${cellAddr}: ${normalized}`);
            return normalized;
          }
        }
        
        // PRIORITY 2: Parse string values
        if (typeof val === 'string') {
          const m = val.match(datePattern);
          if (m) {
            const normalized = normalizeDateStr(m[1]);
            console.log(`✅ Parsed string "${val}" at ${cellAddr}: ${normalized}`);
            return normalized;
          }
        }
        
        // PRIORITY 3: Parse Excel serial numbers
        if (typeof val === 'number') {
          if (val > 40000 && val < 60000) {
            const dc = XLSX.SSF.parse_date_code(val);
            if (dc) {
              const parsed = `${pad2(dc.d)}/${pad2(dc.m)}/${dc.y}`;
              console.log(`⚠️ Parsed serial ${val} at ${cellAddr}: ${parsed} (from date code: d=${dc.d}, m=${dc.m}, y=${dc.y})`);
              return parsed;
            }
          }
          if (val >= 1 && val <= 31 && headerMonth && headerYear) {
            const parsed = `${pad2(val)}/${pad2(headerMonth)}/${headerYear}`;
            console.log(`✅ Parsed day number ${val} at ${cellAddr}: ${parsed}`);
            return parsed;
          }
        }
        
        console.log(`❌ Could not parse date at ${cellAddr}`);
        return '';
      };

      // 1) Propagar datas de merges na coluna A (c=0)
      for (const m of merges) {
        if (m.s.c === 0 && m.e.c === 0) {
          const topAddr = XLSX.utils.encode_cell({ r: m.s.r, c: 0 });
          const topCell = (firstSheet as any)[topAddr];
          const parsed = parseDateFromAny(topCell?.v, topAddr, topCell?.w);
          if (parsed) {
            console.log(`📌 Merge detected at ${topAddr} (rows ${m.s.r}-${m.e.r}): ${parsed}`);
            for (let r = m.s.r; r <= m.e.r; r++) dateByAbsRow[r] = parsed;
          }
        }
      }

      // 2) Linhas não cobertas por merge: ler A{linha} usando índices absolutos da folha
      for (let rAbs = startRow; rAbs <= endRow; rAbs++) {
        if (dateByAbsRow[rAbs]) continue;
        const addr = XLSX.utils.encode_cell({ r: rAbs, c: 0 });
        const cell = (firstSheet as any)[addr];
        const parsed = parseDateFromAny(cell?.v, addr, cell?.w);
        if (parsed) dateByAbsRow[rAbs] = parsed;
      }

      console.log(
        'Exemplo datas Coluna A (primeiras 15 linhas visíveis):',
        Array.from({ length: 15 }, (_, k) => ({
          jsonIndex: k,
          sheetRow: startRow + k,
          date: dateByAbsRow[startRow + k]
        }))
      );

      const isDayNumber = (v: unknown) => typeof v === 'number' && v >= 1 && v <= 31;
      const isExcelSerial = (v: unknown) => typeof v === 'number' && v > 40000 && v < 60000;
      const looksLikeDateStr = (v: unknown) => typeof v === 'string' && (datePattern.test(v) || v.includes('/') || v.includes('-'));

      const buildDateFromDay = (day: number): string | '' => {
        if (!headerMonth || !headerYear) return '';
        const d = new Date(headerYear, headerMonth - 1, day);
        return toPtDate(d);
      };

      // Helper to check if cell has gray background
      const isCellGray = (cellAddr: string): boolean => {
        const cell = (firstSheet as any)[cellAddr];
        if (!cell) {
          console.log(`❌ No cell at ${cellAddr}`);
          return false;
        }
        
        if (!cell.s) {
          console.log(`❌ No style at ${cellAddr}`);
          return false;
        }
        
        const style = cell.s;
        console.log(`🎨 Cell ${cellAddr} style:`, JSON.stringify({
          fgColor: style.fgColor,
          bgColor: style.bgColor,
          patternType: style.patternType
        }));
        
        // Check fgColor (foreground/pattern color)
        if (style.fgColor && style.fgColor.rgb) {
          const rgb = style.fgColor.rgb;
          const r = parseInt(rgb.substring(2, 4), 16);
          const g = parseInt(rgb.substring(4, 6), 16);
          const b = parseInt(rgb.substring(6, 8), 16);
          
          console.log(`🎨 fgColor RGB at ${cellAddr}: R=${r}, G=${g}, B=${b}`);
          
          // Gray if RGB values are close (within 15) and above 180 (light gray)
          if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15 && r >= 180) {
            console.log(`✅ Cell ${cellAddr} is GRAY (fgColor)`);
            return true;
          }
        }
        
        // Check bgColor (background color)
        if (style.bgColor && style.bgColor.rgb) {
          const rgb = style.bgColor.rgb;
          const r = parseInt(rgb.substring(2, 4), 16);
          const g = parseInt(rgb.substring(4, 6), 16);
          const b = parseInt(rgb.substring(6, 8), 16);
          
          console.log(`🎨 bgColor RGB at ${cellAddr}: R=${r}, G=${g}, B=${b}`);
          
          if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15 && r >= 180) {
            console.log(`✅ Cell ${cellAddr} is GRAY (bgColor)`);
            return true;
          }
        }
        
        console.log(`❌ Cell ${cellAddr} is NOT gray`);
        return false;
      };

      const entries: ServiceEntry[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] || [];
        if (row.length === 0) continue;

        // Encontrar células que correspondem ao número mecanográfico
        const mechIdxs: number[] = [];
        for (let c = 0; c < row.length; c++) {
          const cell = row[c];
          if (cell === null || cell === undefined) continue;
          const cellStr = String(cell).trim();
          if (cellStr === String(mechNumber).trim()) mechIdxs.push(c);
        }
        if (mechIdxs.length === 0) continue;

        // Para cada ocorrência, detetar data e nome
        for (const mechCol of mechIdxs) {
          const sheetRow = startRow + i;
          let foundDate = dateByAbsRow[sheetRow] || '';
          
          const mechAddr = XLSX.utils.encode_cell({ r: sheetRow, c: mechCol });
          const dateAddr = XLSX.utils.encode_cell({ r: sheetRow, c: 0 });

          console.log(`\n📍 Found mech ${mechNumber} at ${mechAddr} (sheetRow ${sheetRow}, json idx ${i})`);
          console.log(`   🗓️  Reading date from ${dateAddr} (same row)`);
          console.log(`   📅 Date found in dateByAbsRow[${sheetRow}]: "${foundDate}"`);

          // Usar APENAS a Coluna A (data) para determinar a data
          if (!foundDate) {
            const addrA = XLSX.utils.encode_cell({ r: sheetRow, c: 0 });
            const cellA = (firstSheet as any)[addrA];
            console.log(`   ⚠️  No date in dateByAbsRow, trying to parse from ${addrA}`);
            foundDate = parseDateFromAny(cellA?.v, addrA, cellA?.w);
            console.log(`   📅 Parsed date: "${foundDate}"`);
          }

          // Fallback: procurar somente na Coluna A para cima (para casos de mesclagem não detectada)
          if (!foundDate) {
            for (let upAbs = sheetRow - 1; upAbs >= Math.max(startRow, sheetRow - 20); upAbs--) {
              const addrUp = XLSX.utils.encode_cell({ r: upAbs, c: 0 });
              const cellUp = (firstSheet as any)[addrUp];
              const parsedUp = parseDateFromAny(cellUp?.v, addrUp, cellUp?.w);
              if (parsedUp) { 
                console.log(`🔼 Using date from ${addrUp} for row ${sheetRow}: ${parsedUp}`);
                foundDate = parsedUp; 
                break; 
              }
            }
          }

          // Log if mech number found but no date
          if (!foundDate) {
            console.warn(`⚠️ Found mech ${mechNumber} at row ${sheetRow} (json idx ${i}) but no date in col A`);
          }

          if (foundDate) {
            // Extrair nome: preferir a 3ª coluna (Nome). Se vazia, procurar à direita do nº mecanográfico e por fim melhor string da linha
            let name = '';
            if (typeof row[2] === 'string' && row[2].trim()) {
              name = row[2].trim();
            } else {
              const alphaScore = (s: string) => (s.match(/[A-Za-zÁ-ú]/g) || []).length;
              // tentar à direita do nº mecanográfico
              for (let c = mechCol + 1; c < row.length; c++) {
                const v = row[c];
                if (typeof v === 'string' && alphaScore(v) >= 2) { name = v.trim(); break; }
              }
              // fallback: melhor string da linha
              if (!name) {
                let best = '';
                for (const v of row) if (typeof v === 'string' && alphaScore(v) >= 2 && v.trim() !== String(mechNumber)) {
                  if (v.length > best.length) best = v.trim();
                }
                name = best;
              }
            }

            // Temporarily disabled gray cell detection for debugging
            const mechAddr = XLSX.utils.encode_cell({ r: sheetRow, c: mechCol });
            
            console.log('✅ Found service (XLSX):', { 
              foundDate, 
              mechNumber, 
              name, 
              mechAddr, 
              sheetRow, 
              mechCol,
              dateRowInExcel: sheetRow + 1, // Excel row number (1-indexed)
              mechColInExcel: String.fromCharCode(65 + mechCol) // Excel column letter
            });
            
            const entryIndex = entries.length;
            entries.push({ date: foundDate, mechanographicNumber: mechNumber, rawText: name, isGray: false });
            console.log(`➕ Entry #${entryIndex} added:`, { date: foundDate, mech: mechNumber });
          }
        }
      }

      console.log('Total entries found:', entries.length);
      console.log('📋 All entries found (raw):', entries.map((e, i) => ({ 
        index: i,
        date: e.date, 
        mech: e.mechanographicNumber,
        rawText: e.rawText 
      })));
      
      console.log('\n🎯 FINAL ARRAY that will be shown in table:');
      entries.forEach((e, i) => {
        console.log(`  [${i}] Date: "${e.date}" | Mech: ${e.mechanographicNumber}`);
      });
      
      // No deduplication - show all services as found
      setServices(entries);
      
      if (entries.length === 0) {
        toast({
          title: "Nenhum serviço encontrado",
          description: "Não foram encontrados serviços ativos para o seu número mecanográfico na escala.",
          variant: "default",
        });
      } else {
        toast({
          title: "Escala carregada",
          description: `Encontrados ${entries.length} serviço(s).`,
        });
      }
    } catch (error) {
      console.error('Error loading XLSX:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar escala XLSX');
      toast({
        title: "Erro",
        description: "Erro ao carregar a escala XLSX. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const extractDataFromPdfText = (text: string, userMechNumber: string): ServiceEntry[] => {
    const entries: ServiceEntry[] = [];
    const lines = text.split('\n');
    
    // Pattern to match dates in format DD/MM/YY, DD/MM/YYYY, DD-MM-YY or DD-MM-YYYY
    const datePattern = /(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/;
    
    console.log('Total lines in PDF:', lines.length);
    console.log('Searching for mechanographic number:', userMechNumber);
    
    let linesWithMechNumber = 0;
    let linesWithDate = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      if (trimmedLine.includes(userMechNumber)) {
        linesWithMechNumber++;
        console.log('Line with mech number:', trimmedLine);
      }
      
      const dateMatch = trimmedLine.match(datePattern);
      if (dateMatch) {
        linesWithDate++;
      }
      
      if (dateMatch && trimmedLine.includes(userMechNumber)) {
        const date = dateMatch[1];
        const parts = trimmedLine.split(/\s+/);
        const dateIndex = parts.findIndex(p => datePattern.test(p));
        
        console.log('Found matching line - Date:', date, 'Parts:', parts);
        
        // Prefer the exact user mechanographic number if present
        let mechNumber = userMechNumber;
        if (dateIndex !== -1 && dateIndex + 1 < parts.length) {
          const candidate = parts[dateIndex + 1].replace(/[^\d]/g, '');
          if (candidate === userMechNumber) {
            mechNumber = candidate;
          }
        }
        
        entries.push({
          date,
          mechanographicNumber: mechNumber,
          rawText: trimmedLine,
        });
      }
    }
    
    console.log('Lines with mech number:', linesWithMechNumber);
    console.log('Lines with dates:', linesWithDate);
    console.log('Matched entries:', entries.length);
    
    return entries;
  };

  const loadAndParsePdf = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get user info to find mechanographic number
      const storedUser = localStorage.getItem('mysqlConnection');
      if (!storedUser) {
        throw new Error('Utilizador não encontrado');
      }
      
      const userInfo = JSON.parse(storedUser);
      const mechNumber = userMechanographicNumber || userInfo.mechanographic_number;
      
      if (!mechNumber) {
        throw new Error('Número mecanográfico não encontrado');
      }

      // Get PDF URL from system settings
      const pdfUrl = await systemSettingsService.getSystemSetting('current_schedule_pdf');
      
      if (!pdfUrl) {
        setError('Nenhuma escala disponível para análise');
        setIsLoading(false);
        return;
      }

      // Convert Google Drive preview URL to download URL if needed
      let downloadUrl = pdfUrl;
      if (pdfUrl.includes('drive.google.com')) {
        const fileIdMatch = pdfUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch) {
          const fileId = fileIdMatch[1];
          // Use Google Drive's export endpoint for direct download
          downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
      }

      console.log('Fetching PDF via proxy from:', downloadUrl);

      // Fetch PDF through edge function proxy to avoid CORS
      // Use direct fetch for binary data
      const functionUrl = `https://lddfufxcrnqixfiyhrvc.supabase.co/functions/v1/fetch-pdf`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZGZ1Znhjcm5xaXhmaXlocnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzMzQ0NTIsImV4cCI6MjA1NTkxMDQ1Mn0.iFp4F3zj6JnI2siIJ_CAef4M-33BKBgbHYMLCzR2Fxc'
        },
        body: JSON.stringify({ url: downloadUrl })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch PDF error:', errorText);
        throw new Error(`Erro ao carregar PDF: ${response.statusText}`);
      }

      // Get the PDF as ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      const pdfData = new Uint8Array(arrayBuffer);

      console.log('PDF data received, size:', pdfData.byteLength);

      // Load the PDF from the fetched data
      const loadingTask = pdfjsLib.getDocument({
        data: pdfData,
      });

      const pdf = await loadingTask.promise;
      console.log('PDF loaded, pages:', pdf.numPages);

      let allText = '';
      const allLines: string[] = [];
      const allTokens: { str: string; x: number; y: number; page: number }[] = [];

      // Extract text from all pages preserving positions to rebuild rows
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        const items = textContent.items as any[];
        const tolerance = 2; // y-distance tolerance to group into the same line

        type Line = { y: number; items: { x: number; str: string }[] };
        const lines: Line[] = [];

        const findLineIndex = (y: number) => lines.findIndex((l) => Math.abs(l.y - y) <= tolerance);

        for (const it of items) {
          const tr = (it as any).transform || [];
          const x = (tr[4] ?? 0) as number;
          const y = (tr[5] ?? 0) as number;
          const s = (it as any).str as string;
          const idx = findLineIndex(y);
          if (idx === -1) {
            lines.push({ y, items: [{ x, str: s }] });
          } else {
            lines[idx].items.push({ x, str: s });
          }
          allTokens.push({ str: s, x, y, page: pageNum });
        }

        // Sort lines by vertical position and items by horizontal position
        lines.sort((a, b) => b.y - a.y);
        for (const ln of lines) {
          ln.items.sort((a, b) => a.x - b.x);
          const lineText = ln.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
          if (lineText) allLines.push(lineText);
        }
      }

      allText = allLines.join('\n');
      console.log('Reconstructed lines:', allLines.length);


      console.log('Extracted text length:', allText.length);
      console.log('Searching for mechanographic number:', mechNumber);

      // Try token-based matching first (more reliable for tables)
      const datePattern = /(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/;
      const tokensDates = allTokens.filter(t => datePattern.test(t.str));
      const tokensMech = allTokens.filter(t => t.str.replace(/[^\d]/g, '') === mechNumber);

      console.log('=== TOKEN ANALYSIS ===');
      console.log('Total date tokens found:', tokensDates.length);
      console.log('Total mech number tokens found:', tokensMech.length);
      console.log('Mech number tokens positions:', tokensMech.map(m => ({ page: m.page, x: m.x, y: m.y, str: m.str })));

      const toleranceY = 30; // Large tolerance for merged cells
      const matchedByTokens: ServiceEntry[] = [];

      for (const m of tokensMech) {
        console.log(`\n--- Processing mech token at page ${m.page}, x:${m.x}, y:${m.y} ---`);
        
        // For merged cells, the date is typically at the top of the merged area
        // Look for dates on the same page that are:
        // 1. To the left of the mech number (in the first column)
        // 2. At the same Y level OR above (for merged cells)
        const candidates = tokensDates
          .filter(d => 
            d.page === m.page && 
            d.x < m.x && // Date is in a column to the left
            d.y >= m.y - toleranceY && // Date is at same level or above (within tolerance)
            d.y <= m.y + 5 // Allow small amount below for same-line matching
          )
          .sort((a, b) => {
            // Prefer dates closer vertically
            const yDistA = Math.abs(a.y - m.y);
            const yDistB = Math.abs(b.y - m.y);
            if (Math.abs(yDistA - yDistB) > 2) return yDistA - yDistB;
            
            // Then prefer dates that are higher (for merged cells, date is at top)
            if (Math.abs(a.y - b.y) > 2) return b.y - a.y;
            
            // Finally prefer dates closer horizontally
            const xDistA = Math.abs(m.x - a.x);
            const xDistB = Math.abs(m.x - b.x);
            return xDistA - xDistB;
          });
        
        console.log('All candidate dates:', candidates.map(c => ({ 
          str: c.str, 
          x: c.x, 
          y: c.y,
          deltaY: m.y - c.y,
          deltaX: m.x - c.x 
        })));
        
        if (candidates[0]) {
          const date = candidates[0].str;
          const rawLine = allLines.find(l => l.includes(date) && l.includes(mechNumber)) || `${date} ${mechNumber}`;
          
          // Extract just the name (third column) from the raw line
          const parts = rawLine.split(/\s+/);
          const mechIndex = parts.findIndex(p => p.replace(/[^\d]/g, '') === mechNumber);
          let name = '';
          if (mechIndex !== -1 && mechIndex + 1 < parts.length) {
            // Name is typically after the mech number, take next 2-3 words
            const nameParts = parts.slice(mechIndex + 1, mechIndex + 4).filter(p => !/^\d+$/.test(p));
            name = nameParts.join(' ');
          }
          
          console.log('✓ Matched:', { date, rawLine, name, deltaY: m.y - candidates[0].y });
          matchedByTokens.push({ date, mechanographicNumber: mechNumber, rawText: name || rawLine });
        } else {
          console.log('✗ No date candidate found for this mech number');
        }
      }

      console.log('\n=== BEFORE DEDUPLICATION ===');
      console.log('Total matches:', matchedByTokens.length);
      console.log('Matches:', matchedByTokens.map(m => m.date));

      // Deduplicate by date
      const uniqueByDate = new Map<string, ServiceEntry>();
      for (const e of matchedByTokens) uniqueByDate.set(e.date, e);
      const tokenResults = Array.from(uniqueByDate.values());
      
      console.log('\n=== AFTER DEDUPLICATION ===');
      console.log('Unique matches:', tokenResults.length);
      console.log('Unique dates:', tokenResults.map(r => r.date));

      // Fallback to text-based extraction if needed
      const fallbackResults = tokenResults.length === 0 ? extractDataFromPdfText(allText, mechNumber) : tokenResults;

      console.log('Found services (token-based):', tokenResults.length, ' | Fallback total:', fallbackResults.length);

      if (fallbackResults.length === 0) {
        setError(`Nenhum serviço encontrado para o número mecanográfico ${mechNumber}`);
      }

      setServices(fallbackResults);
      
    } catch (err: any) {
      console.error('Error loading/parsing PDF:', err);
      
      let errorMessage = 'Erro ao carregar ou analisar a escala';
      
      if (err.message?.includes('CORS') || err.name === 'UnknownErrorException') {
        errorMessage = 'Não foi possível aceder ao PDF. Por favor, certifique-se que o PDF está acessível publicamente.';
      } else if (err.message?.includes('não encontrado')) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Meus Serviços
          </CardTitle>
          <CardDescription>
            Visualize os dias em que está escalado com base na escala atual
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">A analisar a escala...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-destructive mb-2">{error}</div>
              <p className="text-sm text-muted-foreground">
                Se o problema persistir, contacte o administrador.
              </p>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Não foram encontrados serviços agendados para si na escala atual.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Encontrados {services.length} dia(s) de serviço
                </p>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Número Mecanográfico</TableHead>
                      <TableHead className="hidden md:table-cell">Informação Completa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{service.date}</TableCell>
                        <TableCell>{service.mechanographicNumber}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {service.rawText}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyServices;
