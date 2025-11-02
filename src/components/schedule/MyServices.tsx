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
    
    // Pattern to match dates in format DD/MM/YYYY or DD-MM-YYYY
    const datePattern = /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Check if line contains a date and the user's mechanographic number
      const dateMatch = trimmedLine.match(datePattern);
      if (dateMatch && trimmedLine.includes(userMechNumber)) {
        const date = dateMatch[1];
        
        // Extract the mechanographic number (should be near the date)
        // Assuming format: DATE MECH_NUMBER ...
        const parts = trimmedLine.split(/\s+/);
        const dateIndex = parts.findIndex(p => datePattern.test(p));
        
        if (dateIndex !== -1 && dateIndex + 1 < parts.length) {
          const mechNumber = parts[dateIndex + 1];
          
          entries.push({
            date: date,
            mechanographicNumber: mechNumber,
            rawText: trimmedLine
          });
        }
      }
    }
    
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
      const { data: pdfData, error: fetchError } = await supabase.functions.invoke('fetch-pdf', {
        body: { url: downloadUrl }
      });

      if (fetchError) {
        throw new Error(`Erro ao carregar PDF: ${fetchError.message}`);
      }

      // Load the PDF from the fetched data
      const loadingTask = pdfjsLib.getDocument({
        data: pdfData,
      });

      const pdf = await loadingTask.promise;
      console.log('PDF loaded, pages:', pdf.numPages);

      let allText = '';

      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        allText += pageText + '\n';
      }

      console.log('Extracted text length:', allText.length);
      console.log('Searching for mechanographic number:', mechNumber);

      // Extract entries for this user
      const userServices = extractDataFromPdfText(allText, mechNumber);
      
      console.log('Found services:', userServices.length);
      
      if (userServices.length === 0) {
        setError(`Nenhum serviço encontrado para o número mecanográfico ${mechNumber}`);
      }
      
      setServices(userServices);
      
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
