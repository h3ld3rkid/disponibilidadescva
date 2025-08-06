import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { systemSettingsService } from '@/services/supabase/systemSettingsService';

const FooterTextConfig = () => {
  const { toast } = useToast();
  const [footerText, setFooterText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadFooterText();
  }, []);

  const loadFooterText = async () => {
    setIsLoading(true);
    try {
      const text = await systemSettingsService.getSystemSetting('footer_text');
      setFooterText(text || '');
    } catch (error) {
      console.error('Error loading footer text:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o texto do rodapé.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveFooterText = async () => {
    setIsSaving(true);
    try {
      const success = await systemSettingsService.upsertSystemSetting(
        'footer_text',
        footerText.trim(),
        'Texto personalizado para o rodapé da aplicação'
      );

      if (success) {
        toast({
          title: "Sucesso",
          description: "Texto do rodapé guardado com sucesso.",
          variant: "default",
        });
      } else {
        throw new Error('Falha ao guardar');
      }
    } catch (error) {
      console.error('Error saving footer text:', error);
      toast({
        title: "Erro",
        description: "Não foi possível guardar o texto do rodapé.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const clearFooterText = () => {
    setFooterText('');
    toast({
      title: "Texto limpo",
      description: "O texto do rodapé foi limpo. Clique em 'Guardar' para confirmar.",
      variant: "default",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Texto do Rodapé</CardTitle>
        <CardDescription>
          Configure um texto personalizado que aparecerá no rodapé da aplicação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="footer-text">
            Texto do Rodapé (máximo 200 caracteres)
          </Label>
          <Textarea
            id="footer-text"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value.slice(0, 200))}
            placeholder="Introduza o texto que deseja exibir no rodapé..."
            disabled={isLoading}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            {footerText.length}/200 caracteres
          </p>
        </div>
        
        <div className="flex gap-2 justify-end">
          <Button 
            variant="outline" 
            onClick={clearFooterText}
            disabled={isLoading || isSaving}
          >
            Limpar
          </Button>
          <Button 
            onClick={saveFooterText}
            disabled={isLoading || isSaving}
          >
            {isSaving ? 'A guardar...' : 'Guardar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FooterTextConfig;