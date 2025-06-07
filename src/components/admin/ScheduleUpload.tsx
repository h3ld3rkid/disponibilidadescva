
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { systemSettingsService } from "@/services/supabase/systemSettingsService";

const ScheduleUpload = () => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLinkUrl, setPdfLinkUrl] = useState<string>('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is admin
    const storedUser = localStorage.getItem('mysqlConnection');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role !== 'admin') {
          toast({
            title: "Acesso negado",
            description: "Apenas administradores podem aceder a esta página.",
            variant: "destructive",
          });
          navigate('/dashboard');
        }
      } catch (error) {
        console.error("Error parsing user info:", error);
        navigate('/dashboard');
      }
    } else {
      navigate('/login');
    }
    
    // Load PDF URL from Supabase instead of localStorage
    const loadCurrentSchedulePdf = async () => {
      try {
        const data = await systemSettingsService.getSystemSetting('current_schedule_pdf');
        if (data) {
          setPdfUrl(data);
          setPdfLinkUrl(data);
        }
      } catch (err) {
        console.error('Error loading current schedule PDF:', err);
      }
    };
    
    loadCurrentSchedulePdf();
  }, [toast, navigate]);

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

    // Simple validation to check if it's a PDF link or ends with .pdf
    if (!pdfLinkUrl.toLowerCase().includes('.pdf') && 
        !pdfLinkUrl.includes('drive.google.com') && 
        !pdfLinkUrl.includes('docs.google.com')) {
      toast({
        title: "URL possivelmente inválido",
        description: "O URL inserido pode não ser um PDF válido. Verifique se o link é correto.",
        variant: "destructive",
      });
      return;
    }

    // Convert Google Drive URLs to embed format if applicable
    let embedUrl = pdfLinkUrl;
    
    // If it's a standard Google Drive view URL, convert it to an embed URL
    if (pdfLinkUrl.includes('drive.google.com/file/d/') && !pdfLinkUrl.includes('embedded=true')) {
      const fileId = pdfLinkUrl.split('/file/d/')[1].split('/')[0];
      embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    }

    try {
      // Save to Supabase instead of localStorage
      const success = await systemSettingsService.upsertSystemSetting(
        'current_schedule_pdf',
        embedUrl,
        'URL for the current schedule PDF'
      );
          
      if (!success) throw new Error("Failed to save PDF link");
      
      setPdfUrl(embedUrl);
      
      toast({
        title: "Link guardado",
        description: "O link para a escala foi guardado com sucesso e está disponível para todos os utilizadores.",
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
          <CardTitle>Gestão da Escala Atual</CardTitle>
          <CardDescription>
            Adicione o link do PDF da escala mensal que ficará visível para todos os utilizadores em todos os dispositivos
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="mb-6 p-4 border rounded-md bg-slate-50">
            <h3 className="font-medium mb-2">Adicionar link do PDF</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="pdf-link">Link para o PDF da escala:</Label>
                <Input
                  id="pdf-link"
                  value={pdfLinkUrl}
                  onChange={(e) => setPdfLinkUrl(e.target.value)}
                  placeholder="https://exemplo.com/escala.pdf"
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
          
          {pdfUrl ? (
            <div className="w-full rounded-md overflow-hidden shadow-md">
              <iframe 
                src={pdfUrl}
                className="w-full h-[400px] border-0" 
                title="Escala Atual"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
              <div className="mt-4 text-sm text-gray-500">
                Pré-visualização da escala atual carregada - disponível para todos os utilizadores
              </div>
            </div>
          ) : (
            <div className="py-10 text-center">
              <div className="text-gray-500">
                Nenhuma escala carregada. Adicione um link para a escala atual.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduleUpload;
