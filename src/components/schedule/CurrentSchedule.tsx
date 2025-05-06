
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/services/supabase/client";
import { systemSettingsService } from "@/services/supabase/systemSettingsService";

interface CurrentScheduleProps {
  isAdmin?: boolean;
}

const CurrentSchedule: React.FC<CurrentScheduleProps> = ({ isAdmin = false }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLinkUrl, setPdfLinkUrl] = useState<string>('');
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
    
    loadCurrentSchedulePdf();
    
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
        })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSavePdfLink = async () => {
    // Validate the URL (simple validation)
    if (!pdfLinkUrl) {
      toast({
        title: "URL inválido",
        description: "Por favor, insira um URL válido para o PDF.",
        variant: "destructive",
      });
      return;
    }

    // Simple validation to check if it's a PDF link
    const isPdfUrl = pdfLinkUrl.toLowerCase().includes('.pdf');
    const isGoogleDriveUrl = pdfLinkUrl.includes('drive.google.com');
    const isGoogleDocsUrl = pdfLinkUrl.includes('docs.google.com');
    
    if (!isPdfUrl && !isGoogleDriveUrl && !isGoogleDocsUrl) {
      toast({
        title: "URL possivelmente inválido",
        description: "O URL inserido pode não ser um PDF. Verifique se o link é correto.",
        variant: "destructive",
      });
      return;
    }

    // Convert Google Drive URLs to embed format if applicable
    let embedUrl = pdfLinkUrl;
    
    // If it's a standard Google Drive view URL, convert it to an embed URL
    if (isGoogleDriveUrl && pdfLinkUrl.includes('/file/d/')) {
      const fileId = pdfLinkUrl.split('/file/d/')[1].split('/')[0];
      embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    }

    try {
      // Use our typed service function to upsert the system setting
      const success = await systemSettingsService.upsertSystemSetting(
        'current_schedule_pdf',
        embedUrl,
        'URL for the current schedule PDF'
      );
          
      if (!success) throw new Error("Failed to save PDF link");
      
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
                    placeholder="Insira o URL do PDF da escala"
                    className="mt-1"
                  />
                </div>
                <Button 
                  onClick={handleSavePdfLink} 
                  className="bg-[#6E59A5] hover:bg-[#5d4a8b]"
                >
                  Guardar Link
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
        </CardContent>
      </Card>
    </div>
  );
};

export default CurrentSchedule;
