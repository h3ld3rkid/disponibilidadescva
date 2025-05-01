
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CurrentScheduleProps {
  isAdmin?: boolean;
}

const CurrentSchedule: React.FC<CurrentScheduleProps> = ({ isAdmin = false }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [googleDriveUrl, setGoogleDriveUrl] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    // Load PDF URL from localStorage if available
    const storedPdfUrl = localStorage.getItem('currentSchedulePdf');
    if (storedPdfUrl) {
      setPdfUrl(storedPdfUrl);
    }
  }, []);

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
          <CardTitle>Escala Atual</CardTitle>
          <CardDescription>
            Consulte a escala atual do mês em vigor
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isAdmin && (
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
          )}
          
          {pdfUrl ? (
            <div className="w-full rounded-md overflow-hidden shadow-md">
              <iframe 
                src={pdfUrl} 
                className="w-full h-[600px] border-0" 
                title="Escala Atual"
              />
            </div>
          ) : (
            <div className="py-10 text-center">
              <div className="text-gray-500">
                {isAdmin 
                  ? "Nenhuma escala disponível. Por favor, adicione um link para a escala no Google Drive." 
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
