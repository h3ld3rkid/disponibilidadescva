
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

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
                  ? "Nenhuma escala carregada. Faça upload de um PDF da escala atual no menu Administração." 
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
