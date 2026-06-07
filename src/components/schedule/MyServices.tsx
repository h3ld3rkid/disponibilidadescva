import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { systemSettingsService } from "@/services/supabase/systemSettingsService";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CalendarDays, CalendarPlus, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as XLSX from 'xlsx';
import { getResolvedServicesForMech } from '@/services/scheduleGridService';

// Configure PDF.js worker

// Helper to get weekday name in Portuguese from a date string (DD/MM/YYYY)
const getWeekdayName = (dateStr: string): string => {
  const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const parts = dateStr.split('/');
  if (parts.length !== 3) return '';
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  return weekdays[date.getDay()];
};
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface ServiceEntry {
  date: string;
  startTime?: string;
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
  const [subscriptionUrl, setSubscriptionUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch the user's calendar subscription token
  useEffect(() => {
    (async () => {
      try {
        const storedUser = localStorage.getItem('mysqlConnection');
        if (!storedUser) return;
        const userInfo = JSON.parse(storedUser);
        if (!userInfo?.email) return;
        const { data } = await supabase
          .from('users')
          .select('calendar_token')
          .eq('email', userInfo.email)
          .maybeSingle();
        if (data?.calendar_token) {
          const url = `https://lddfufxcrnqixfiyhrvc.supabase.co/functions/v1/calendar-feed?token=${data.calendar_token}`;
          setSubscriptionUrl(url);
        }
      } catch (e) {
        console.warn('Could not load calendar token', e);
      }
    })();
  }, []);

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
      const storedUser = localStorage.getItem('mysqlConnection');
      if (!storedUser) throw new Error('Utilizador não encontrado');

      const userInfo = JSON.parse(storedUser);
      const mechNumber = userMechanographicNumber || userInfo.mechanographic_number;

      if (!mechNumber) throw new Error('Número mecanográfico não encontrado');

      // Use unified schedule resolver — this is the same source of truth as
      // the "Escala Atualizada" view, so trades are already applied with
      // proper shift matching and chronological replay.
      const resolved = await getResolvedServicesForMech(String(mechNumber));

      const finalEntries: ServiceEntry[] = resolved
        .map(r => ({
          date: r.date,
          startTime: r.startTime,
          mechanographicNumber: r.mechanographicNumber,
          rawText: r.name + (r.isModified ? ' (atualizado por troca)' : ''),
          isGray: r.isGray || false,
        }))
        .sort((a, b) => {
          const [da, ma, ya] = a.date.split('/').map(Number);
          const [db, mb, yb] = b.date.split('/').map(Number);
          const cmp = new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
          if (cmp !== 0) return cmp;
          return Number(a.isGray) - Number(b.isGray);
        });

      setServices(finalEntries);

      // Update subscription cache so the .ics feed reflects latest services
      try {
        const userEmail = userInfo.email;
        if (userEmail) {
          const cachePayload = finalEntries.map(e => ({
            date: e.date,
            startTime: e.startTime,
            mechanographicNumber: e.mechanographicNumber,
            isGray: e.isGray || false,
          }));
          await supabase
            .from('user_service_cache')
            .upsert({
              user_email: userEmail,
              mechanographic_number: String(mechNumber),
              services: cachePayload,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_email' });
        }
      } catch (cacheErr) {
        console.warn('Could not update service cache (non-critical):', cacheErr);
      }

      if (finalEntries.length === 0) {
        toast({
          title: "Nenhum serviço encontrado",
          description: "Não foram encontrados serviços ativos para o seu número mecanográfico na escala.",
          variant: "default",
        });
      } else {
        toast({
          title: "Escala carregada",
          description: `Encontrados ${finalEntries.length} serviço(s).`,
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

  const getShiftTimes = (entry: ServiceEntry): { startH: number; startM: number; endH: number; endM: number; crossDay: boolean; label: string } => {
    const start = entry.startTime || (entry.isGray ? '20:00' : '08:00');
    const [sh, sm] = start.split(':').map(n => parseInt(n, 10));

    // Defined shift durations
    if (sh === 8 && sm === 0) return { startH: 8, startM: 0, endH: 13, endM: 0, crossDay: false, label: 'Serviço CVA' };
    if (sh === 13 && sm === 0) return { startH: 13, startM: 0, endH: 19, endM: 30, crossDay: false, label: 'Serviço CVA' };
    if (sh === 19 && sm === 30) return { startH: 19, startM: 30, endH: 23, endM: 59, crossDay: false, label: 'Serviço CVA' };
    if (sh === 0 && sm === 0) return { startH: 0, startM: 0, endH: 8, endM: 0, crossDay: false, label: 'Serviço CVA' };

    // Fallback: night shift behavior
    if (entry.isGray) {
      return { startH: sh || 20, startM: sm || 0, endH: 8, endM: 0, crossDay: true, label: 'Serviço Noturno CVA' };
    }
    return { startH: sh || 8, startM: sm || 0, endH: 20, endM: 0, crossDay: false, label: 'Serviço CVA' };
  };

  const buildIcsContent = (entries: ServiceEntry[]) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatIcsDate = (dateStr: string, hour: number, min: number, addDay = 0) => {
      const parts = dateStr.split('/');
      if (parts.length !== 3) return '';
      const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]) + addDay);
      return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hour)}${pad(min)}00`;
    };

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Escalas CVA//PT',
      'CALSCALE:GREGORIAN',
    ];

    for (const entry of entries) {
      const t = getShiftTimes(entry);
      const dtStart = formatIcsDate(entry.date, t.startH, t.startM);
      const dtEnd = formatIcsDate(entry.date, t.endH, t.endM, t.crossDay ? 1 : 0);
      if (!dtStart || !dtEnd) continue;

      lines.push(
        'BEGIN:VEVENT',
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${t.label}`,
        `DESCRIPTION:Nº Mecanográfico: ${entry.mechanographicNumber}`,
        `UID:${entry.date.replace(/\//g, '')}-${t.startH}${t.startM}-${entry.mechanographicNumber}@cva`,
        'END:VEVENT'
      );
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  };

  const buildGoogleCalendarUrl = (entry: ServiceEntry) => {
    const parts = entry.date.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const t = getShiftTimes(entry);

    const startDate = new Date(year, month, day, t.startH, t.startM, 0);
    const endDate = new Date(year, month, day + (t.crossDay ? 1 : 0), t.endH, t.endM, 0);

    const fmt = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;

    const details = `Nº Mecanográfico: ${entry.mechanographicNumber}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(t.label)}&dates=${fmt(startDate)}/${fmt(endDate)}&details=${encodeURIComponent(details)}`;
  };


  const syncToCalendar = (entries: ServiceEntry[]) => {
    if (entries.length === 0) return;

    const confirmMsg = `Vão abrir-se ${entries.length} separadores do Google Calendar (um por serviço). Certifique-se que o seu navegador permite pop-ups deste site. Continuar?`;
    if (!window.confirm(confirmMsg)) return;

    entries.forEach((entry, idx) => {
      setTimeout(() => {
        const win = window.open(buildGoogleCalendarUrl(entry), '_blank');
        if (!win && idx === 0) {
          toast({
            title: "Pop-ups bloqueados",
            description: "Permita pop-ups deste site para abrir todos os eventos no Google Calendar.",
            variant: "destructive",
          });
        }
      }, idx * 400);
    });

    toast({
      title: "A sincronizar com Google Calendar",
      description: `A abrir ${entries.length} serviço(s) no Google Calendar.`,
    });
  };


  const addSingleToCalendar = (entry: ServiceEntry) => {
    window.open(buildGoogleCalendarUrl(entry), '_blank');
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
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-lg font-semibold">Serviços Agendados</h3>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    {services.length} serviço(s) • {services.filter(s => s.isGray).length} noturno(s)
                  </p>
                  <Button variant="outline" size="sm" onClick={() => syncToCalendar(services)}>
                    <CalendarPlus className="h-4 w-4 mr-1" />
                    Sincronizar com Calendário
                  </Button>
                  {subscriptionUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const webcalUrl = subscriptionUrl.replace(/^https?:\/\//, 'webcal://');
                        const googleAddUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;
                        try {
                          await navigator.clipboard.writeText(subscriptionUrl);
                        } catch {
                          // ignore clipboard errors
                        }
                        toast({
                          title: "A abrir Google Calendar...",
                          description: "Confirma 'Adicionar' no Google Calendar. O link também foi copiado caso precises.",
                        });
                        window.open(googleAddUrl, '_blank', 'noopener,noreferrer');
                      }}
                      title="Abrir Google Calendar e adicionar subscrição automática"
                    >
                      <LinkIcon className="h-4 w-4 mr-1" />
                      Adicionar ao Google Calendar
                    </Button>
                  )}
                </div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Número Mecanográfico</TableHead>
                      <TableHead className="hidden md:table-cell">Informação Completa</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service, index) => (
                      <TableRow 
                        key={index}
                        className={service.isGray ? "bg-accent/70" : ""}
                      >
                        <TableCell className="font-medium">
                          {service.date} <span className="text-muted-foreground">({getWeekdayName(service.date)})</span>
                          {service.isGray && <span className="ml-2 text-muted-foreground">🌙</span>}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {service.startTime || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>{service.mechanographicNumber}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {service.rawText}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => addSingleToCalendar(service)}
                            title="Adicionar ao calendário"
                          >
                            <CalendarPlus className="h-4 w-4" />
                          </Button>
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
