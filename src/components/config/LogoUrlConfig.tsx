import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { systemSettingsService } from '@/services/supabase/systemSettingsService';

const DEFAULT_LOGO = 'https://amares.cruzvermelha.pt/images/site/Amares.webp';

const LogoUrlConfig = () => {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const url = await systemSettingsService.getSystemSetting('logo_url');
        setLogoUrl(url || '');
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setIsSaving(true);
    try {
      const ok = await systemSettingsService.upsertSystemSetting(
        'logo_url',
        logoUrl.trim(),
        'URL do logotipo apresentado no Login e Navbar'
      );
      if (!ok) throw new Error();
      toast({ title: 'Sucesso', description: 'Logotipo guardado. Atualize a página para ver as alterações.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível guardar o logotipo.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const preview = logoUrl.trim() || DEFAULT_LOGO;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logotipo da Aplicação</CardTitle>
        <CardDescription>
          Configure o URL da imagem do logotipo apresentado no ecrã de Login e na barra de navegação.
          Deixe vazio para usar o logotipo padrão.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="logo-url">URL da imagem</Label>
          <Input
            id="logo-url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://exemplo.com/logo.png"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label>Pré-visualização</Label>
          <div className="border rounded-md p-4 bg-muted/30 flex items-center justify-center">
            <img
              src={preview}
              alt="Pré-visualização do logotipo"
              className="h-16 object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setLogoUrl('')} disabled={isLoading || isSaving}>
            Limpar (usar padrão)
          </Button>
          <Button onClick={save} disabled={isLoading || isSaving}>
            {isSaving ? 'A guardar...' : 'Guardar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LogoUrlConfig;
