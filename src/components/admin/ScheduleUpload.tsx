
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

const ScheduleUpload = () => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [googleDriveUrl, setGoogleDriveUrl] = useState<string>('');
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
    
    // Load PDF URL from localStorage if available
    const storedPdfUrl = localStorage.getItem('currentSchedulePdf');
    if (storedPdfUrl) {
      setPdfUrl(storedPdfUrl);
      setGoogleDriveUrl(storedPdfUrl);
    }
  }, [toast, navigate]);

  const handleSaveGoogleDriveLink = () => {
    // Validate the URL (simple validation)
    if (!googleDriveUrl || !googleDriveUrl.includes('drive.google.com')) {
      toast({
        title: "URL inválido",
        description: "Por favor, insira um URL válido do Google Drive.",
        variant: "destructive",
      });
      return;
    }

    // Save the URL to localStorage
    localStorage.setItem('currentSchedulePdf', googleDriveUrl);
    setPdfUrl(googleDriveUrl);
    
    toast({
      title: "Link guardado",
      description: "O link para a escala foi guardado com sucesso.",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Gestão da Escala Atual</CardTitle>
          <CardDescription>
            Adicione o link do Google Drive para o PDF da escala mensal que ficará visível para todos os utilizadores
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="mb-6 p-4 border rounded-md bg-slate-50">
            <h3 className="font-medium mb-2">Adicionar link do Google Drive</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="drive-link">Link para o PDF da escala:</Label>
                <Input
                  id="drive-link"
                  value={googleDriveUrl}
                  onChange={(e) => setGoogleDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="mt-1"
                />
              </div>
              <Button 
                onClick={handleSaveGoogleDriveLink} 
                className="bg-[#6E59A5] hover:bg-[#5d4a8b]"
              >
                Guardar Link
              </Button>
            </div>
          </div>
          
          {pdfUrl ? (
            <div className="w-full rounded-md overflow-hidden shadow-md">
              <iframe 
                src={`${pdfUrl}&embedded=true&rm=minimal`}
                className="w-full h-[400px] border-0" 
                title="Escala Atual"
                sandbox="allow-scripts allow-same-origin"
              />
              <div className="mt-4 text-sm text-gray-500">
                Pré-visualização da escala atual carregada
              </div>
            </div>
          ) : (
            <div className="py-10 text-center">
              <div className="text-gray-500">
                Nenhuma escala carregada. Adicione um link do Google Drive para a escala atual.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduleUpload;
