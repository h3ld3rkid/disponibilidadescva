
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { systemSettingsService } from '@/services/supabase/systemSettingsService';
import { Loader2, Save, Check } from 'lucide-react';

const MONTHS = [
  { key: 'january', label: 'Janeiro' },
  { key: 'february', label: 'Fevereiro' },
  { key: 'march', label: 'Março' },
  { key: 'april', label: 'Abril' },
  { key: 'may', label: 'Maio' },
  { key: 'june', label: 'Junho' },
  { key: 'july', label: 'Julho' },
  { key: 'august', label: 'Agosto' },
  { key: 'september', label: 'Setembro' },
  { key: 'october', label: 'Outubro' },
  { key: 'november', label: 'Novembro' },
  { key: 'december', label: 'Dezembro' },
];

const MonthlyScheduleLinksConfig = () => {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    const loadLinks = async () => {
      const loaded: Record<string, string> = {};
      await Promise.all(
        MONTHS.map(async (month) => {
          const url = await systemSettingsService.getSystemSetting(`schedule_link_${month.key}`);
          if (url) loaded[month.key] = url;
        })
      );
      setLinks(loaded);
    };
    loadLinks();
  }, []);

  const handleSave = async (key: string) => {
    const url = links[key]?.trim();
    setSavingKey(key);
    try {
      if (!url) {
        // Clear the link
        await systemSettingsService.upsertSystemSetting(
          `schedule_link_${key}`,
          '',
          `Link da escala - ${MONTHS.find(m => m.key === key)?.label}`
        );
      } else {
        await systemSettingsService.upsertSystemSetting(
          `schedule_link_${key}`,
          url,
          `Link da escala - ${MONTHS.find(m => m.key === key)?.label}`
        );
      }
      setSavedKeys(prev => new Set(prev).add(key));
      setTimeout(() => setSavedKeys(prev => { const next = new Set(prev); next.delete(key); return next; }), 2000);
      toast({ title: "Guardado", description: `Link de ${MONTHS.find(m => m.key === key)?.label} guardado.` });
    } catch {
      toast({ title: "Erro", description: "Erro ao guardar o link.", variant: "destructive" });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-2">Links das Escalas Mensais</h2>
        <p className="text-sm text-muted-foreground">
          Configure o link do Google Drive para cada mês. Estes links ficam acessíveis a todos os utilizadores na aba "Escala".
        </p>
      </div>

      <div className="space-y-3">
        {MONTHS.map((month) => (
          <div key={month.key} className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
            <div className="flex-1 w-full">
              <Label htmlFor={month.key} className="text-sm font-medium">{month.label}</Label>
              <Input
                id={month.key}
                type="url"
                placeholder="https://drive.google.com/file/d/..."
                value={links[month.key] || ''}
                onChange={(e) => setLinks(prev => ({ ...prev, [month.key]: e.target.value }))}
                className="mt-1"
              />
            </div>
            <Button
              onClick={() => handleSave(month.key)}
              disabled={savingKey === month.key}
              size="sm"
              className="shrink-0"
            >
              {savingKey === month.key ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : savedKeys.has(month.key) ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthlyScheduleLinksConfig;
