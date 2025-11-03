import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { systemSettingsService } from "@/services/supabase/systemSettingsService";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CalendarDays } from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface ServiceEntry {
  date: string;
  mechanographicNumber: string;
  rawText: string;
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
    loadAndParsePdf();
  }, [userMechanographicNumber]);

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

      const toleranceY = 3;
      const matchedByTokens: ServiceEntry[] = [];

      for (const m of tokensMech) {
        const candidates = tokensDates
          .filter(d => d.page === m.page && Math.abs(d.y - m.y) <= toleranceY && d.x <= m.x)
          .sort((a, b) => {
            const ya = Math.abs(a.y - m.y);
            const yb = Math.abs(b.y - m.y);
            if (ya !== yb) return ya - yb;
            const xa = Math.abs(m.x - a.x);
            const xb = Math.abs(m.x - b.x);
            return xa - xb;
          });
        if (candidates[0]) {
          const date = candidates[0].str;
          const rawLine = allLines.find(l => l.includes(date) && l.includes(mechNumber)) || `${date} ${mechNumber}`;
          matchedByTokens.push({ date, mechanographicNumber: mechNumber, rawText: rawLine });
        }
      }

      // Deduplicate by date
      const uniqueByDate = new Map<string, ServiceEntry>();
      for (const e of matchedByTokens) uniqueByDate.set(e.date, e);
      const tokenResults = Array.from(uniqueByDate.values());

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
