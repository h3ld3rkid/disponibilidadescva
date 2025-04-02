
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileUp } from "lucide-react";

interface CurrentScheduleProps {
  isAdmin?: boolean;
}

const CurrentSchedule: React.FC<CurrentScheduleProps> = ({ isAdmin = false }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load PDF URL from localStorage if available
    const storedPdfUrl = localStorage.getItem('currentSchedulePdf');
    if (storedPdfUrl) {
      setPdfUrl(storedPdfUrl);
    }
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Formato inválido",
        description: "Por favor, envie apenas ficheiros PDF.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPdfUrl(dataUrl);
      localStorage.setItem('currentSchedulePdf', dataUrl);
      
      toast({
        title: "PDF carregado com sucesso",
        description: "A escala atual foi atualizada.",
      });
    };
    
    reader.readAsDataURL(file);
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
              <h3 className="font-medium mb-2">Carregar nova escala</h3>
              <div className="flex items-center gap-2">
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 bg-[#6E59A5] hover:bg-[#5d4a8b] text-white py-2 px-4 rounded-md">
                    <FileUp className="h-4 w-4" />
                    <span>Selecionar PDF</span>
                  </div>
                  <input 
                    id="pdf-upload" 
                    type="file" 
                    accept="application/pdf" 
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
                <span className="text-sm text-gray-500">
                  Apenas ficheiros PDF são aceites
                </span>
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
                  ? "Nenhuma escala carregada. Faça upload de um PDF da escala atual." 
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
