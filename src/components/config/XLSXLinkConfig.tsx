import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { systemSettingsService } from '@/services/supabase/systemSettingsService';
import { Loader2, RefreshCw } from 'lucide-react';
import { syncAllUsersServiceCache } from '@/services/serviceCacheSync';

const XLSXLinkConfig = () => {
  const [xlsxUrl, setXlsxUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const runSync = async () => {
    setIsSyncing(true);
    try {
      const r = await syncAllUsersServiceCache();
      toast({ title: "Calendários atualizados", description: `Serviços sincronizados para ${r.synced} utilizadores.` });
    } catch {
      toast({ title: "Erro", description: "Erro ao sincronizar calendários", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentXlsxLink();
  }, []);

  const loadCurrentXlsxLink = async () => {
    try {
      const url = await systemSettingsService.getSystemSetting('schedule_xlsx_link');
      if (url) {
        setXlsxUrl(url);
      }
    } catch (error) {
      console.error('Error loading XLSX link:', error);
    }
  };

  const convertGoogleDriveUrl = (url: string): string => {
    // Convert Google Sheets URL to direct XLSX download URL
    const sheetsMatch = url.match(/\/spreadsheets\/d\/([^\/]+)/);
    if (sheetsMatch) {
      return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/export?format=xlsx`;
    }
    
    // Convert Google Drive sharing URL to direct download URL
    const fileIdMatch = url.match(/\/file\/d\/([^\/]+)/);
    if (fileIdMatch) {
      return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
    }
    
    const idMatch = url.match(/id=([^&]+)/);
    if (idMatch) {
      return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
    }
    
    return url;
  };

  const handleSaveXlsxLink = async () => {
    if (!xlsxUrl.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um link para o ficheiro XLSX",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const convertedUrl = convertGoogleDriveUrl(xlsxUrl);
      const success = await systemSettingsService.upsertSystemSetting(
        'schedule_xlsx_link',
        convertedUrl,
        'Link para o ficheiro XLSX da escala atual'
      );

      if (success) {
        toast({
          title: "Sucesso",
          description: "Link guardado. A sincronizar calendários...",
        });
        runSync();
      } else {
        throw new Error('Failed to save XLSX link');
      }
    } catch (error) {
      console.error('Error saving XLSX link:', error);
      toast({
        title: "Erro",
        description: "Erro ao guardar o link do ficheiro XLSX",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-2">Link do Ficheiro XLSX da Escala</h2>
        <p className="text-sm text-muted-foreground">
          Configure o link para o ficheiro Excel (.xlsx) da escala atual. 
          Este ficheiro alimenta "Meus Serviços", "Escala Atualizada", as trocas e os calendários subscritos. Ao guardar, os calendários de todos os utilizadores são atualizados.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="xlsxUrl">URL do Ficheiro XLSX</Label>
        <Input
          id="xlsxUrl"
          type="url"
          placeholder="https://drive.google.com/file/d/..."
          value={xlsxUrl}
          onChange={(e) => setXlsxUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Pode usar links do Google Sheets, Google Drive, Dropbox ou URL direto para o ficheiro XLSX.
        </p>
      </div>

      <Button 
        onClick={handleSaveXlsxLink} 
        disabled={isLoading}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar Link
      </Button>
      <Button variant="outline" onClick={runSync} disabled={isSyncing} className="ml-2">
        {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
        {isSyncing ? 'A sincronizar...' : 'Sincronizar calendários'}
      </Button>
    </div>
  );
};

export default XLSXLinkConfig;
