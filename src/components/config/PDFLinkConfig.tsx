import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { systemSettingsService } from '@/services/supabase/systemSettingsService';
import { FileText } from 'lucide-react';
const PDFLinkConfig: React.FC = () => {
  const [pdfLink, setPdfLink] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const {
    toast
  } = useToast();
  useEffect(() => {
    const loadPdfLink = async () => {
      try {
        const text = await systemSettingsService.getSystemSetting('additional_pdf_link');
        if (text) {
          setPdfLink(text);
        }
      } catch (error) {
        console.error('Error loading PDF link:', error);
      }
    };
    loadPdfLink();
  }, []);
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const success = await systemSettingsService.upsertSystemSetting('additional_pdf_link', pdfLink, 'Link adicional para ficheiro PDF');
      if (success) {
        toast({
          title: "Link guardado",
          description: "O link do PDF foi guardado com sucesso."
        });
      } else {
        throw new Error('Failed to save PDF link');
      }
    } catch (error) {
      console.error('Error saving PDF link:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao guardar o link do PDF.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Configuração do Link PDF Adicional
        </CardTitle>
        <CardDescription>Colar o link da escala &quot;anterior&quot;</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pdf-link">Link para o ficheiro PDF:</Label>
          <Input id="pdf-link" value={pdfLink} onChange={e => setPdfLink(e.target.value)} placeholder="https://drive.google.com/file/d/..." disabled={isLoading} />
          <p className="text-sm text-muted-foreground">
            Este link será exibido como um botão na secção Escala para os utilizadores acederem ao ficheiro.
          </p>
        </div>
        
        <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? 'A guardar...' : 'Guardar Link'}
        </Button>
      </CardContent>
    </Card>;
};
export default PDFLinkConfig;