
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { systemSettingsService } from "@/services/supabase/systemSettingsService";

interface CurrentScheduleProps {
  isAdmin?: boolean;
}

const CurrentSchedule: React.FC<CurrentScheduleProps> = ({ isAdmin = false }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLinkUrl, setPdfLinkUrl] = useState<string>('');
  const [additionalPdfLink, setAdditionalPdfLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load PDF URL from Supabase using our typed service function
    const loadCurrentSchedulePdf = async () => {
      try {
        const data = await systemSettingsService.getSystemSetting('current_schedule_pdf');
        if (data) {
          console.log('Loaded current schedule PDF URL:', data);
          setPdfUrl(data);
        }
      } catch (err) {
        console.error('Error loading current schedule PDF:', err);
      }
    };
    
    // Load additional PDF link
    const loadAdditionalPdfLink = async () => {
      try {
        const link = await systemSettingsService.getSystemSetting('additional_pdf_link');
        if (link) {
          setAdditionalPdfLink(link);
        }
      } catch (err) {
        console.error('Error loading additional PDF link:', err);
      }
    };
    
    loadCurrentSchedulePdf();
    loadAdditionalPdfLink();
    
    // Set up real-time subscription for system settings changes
    const channel = supabase
      .channel('system-settings-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'system_settings' 
        }, 
        (payload) => {
          // Type casting to avoid TypeScript errors
          const newData = payload.new as { key: string; value: string };
          if (newData && newData.key === 'current_schedule_pdf') {
            console.log('Current schedule PDF URL updated:', newData.value);
            setPdfUrl(newData.value);
          }
          if (newData && newData.key === 'additional_pdf_link') {
            console.log('Additional PDF link updated:', newData.value);
            setAdditionalPdfLink(newData.value);
          }
        })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const convertGoogleDriveUrl = (url: string): string => {
    // Convert various Google Drive URL formats to embed format
    let embedUrl = url;
    
    // Pattern 1: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    if (url.includes('drive.google.com/file/d/') && url.includes('/view')) {
      const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch) {
        const fileId = fileIdMatch[1];
        embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        console.log('Converted Google Drive URL:', embedUrl);
      }
    }
    // Pattern 2: https://drive.google.com/open?id=FILE_ID
    else if (url.includes('drive.google.com/open?id=')) {
      const fileIdMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (fileIdMatch) {
        const fileId = fileIdMatch[1];
        embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        console.log('Converted Google Drive URL (open format):', embedUrl);
      }
    }
    // Pattern 3: Already in preview format
    else if (url.includes('drive.google.com/file/d/') && url.includes('/preview')) {
      embedUrl = url; // Already in correct format
    }
    
    return embedUrl;
  };

  const handleSavePdfLink = async () => {
    if (!pdfLinkUrl.trim()) {
      toast({
        title: "URL inválido",
        description: "Por favor, insira um URL válido para o PDF.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let embedUrl = pdfLinkUrl.trim();
      
      // Convert Google Drive URLs to embed format
      if (embedUrl.includes('drive.google.com')) {
        embedUrl = convertGoogleDriveUrl(embedUrl);
      }
      // Simple validation for other PDF URLs
      else if (!embedUrl.toLowerCase().includes('.pdf') && 
               !embedUrl.includes('docs.google.com')) {
        toast({
          title: "URL possivelmente inválido",
          description: "O URL inserido pode não ser um PDF válido. Verifique se o link é correto.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      console.log('Saving PDF URL:', embedUrl);
      
      const success = await systemSettingsService.upsertSystemSetting(
        'current_schedule_pdf',
        embedUrl,
        'URL for the current schedule PDF'
      );
          
      if (!success) {
        throw new Error("Failed to save PDF link");
      }
      
      setPdfUrl(embedUrl);
      
      toast({
        title: "Link guardado",
        description: "O link para a escala foi guardado com sucesso.",
      });
    } catch (error) {
      console.error("Error saving PDF link:", error);
      toast({
        title: "Erro ao guardar",
        description: "Ocorreu um erro ao guardar o link do PDF.",
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
          <CardTitle>Escala Atual</CardTitle>
          <CardDescription>
            Consulte a escala atual do mês em vigor
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isAdmin && (
            <div className="mb-6 p-4 border rounded-md bg-slate-50">
              <h3 className="font-medium mb-2">Adicionar link do PDF</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="pdf-link">Link para o PDF da escala:</Label>
                  <Input
                    id="pdf-link"
                    value={pdfLinkUrl}
                    onChange={(e) => setPdfLinkUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="mt-1"
                    disabled={isLoading}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Suporta links do Google Drive, Google Docs ou URLs diretos de PDF
                  </p>
                </div>
                <Button 
                  onClick={handleSavePdfLink} 
                  disabled={isLoading}
                  className="bg-[#6E59A5] hover:bg-[#5d4a8b] disabled:opacity-50"
                >
                  {isLoading ? 'A guardar...' : 'Guardar Link'}
                </Button>
              </div>
            </div>
          )}
          
          {pdfUrl ? (
            <div className="w-full rounded-md overflow-hidden shadow-md">
              <iframe 
                src={pdfUrl} 
                className="w-full h-[600px] border-0" 
                title="Escala Atual"
                allow="fullscreen"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads"
              />
              <div className="mt-2 text-center text-sm text-gray-500">
                Este documento está disponível apenas para visualização.
              </div>
              <div className="mt-2 text-center">
                <a 
                  href={pdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-brand-indigo hover:text-brand-darkblue underline text-sm"
                >
                  Abrir em nova janela
                </a>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center">
              <div className="text-gray-500">
                {isAdmin 
                  ? "Nenhuma escala disponível. Por favor, adicione um link para a escala." 
                  : "Nenhuma escala disponível para visualização de momento."}
              </div>
            </div>
          )}
          
          {additionalPdfLink && (
            <div className="mt-6 pt-6 border-t">
              <div className="text-center">
                <Button 
                  asChild
                  variant="outline"
                  className="flex items-center gap-2 mx-auto"
                >
                  <a 
                    href={additionalPdfLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="no-underline"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Aceder ao ficheiro PDF
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CurrentSchedule;
