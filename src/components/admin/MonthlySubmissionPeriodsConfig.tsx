import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { systemSettingsService } from "@/services/supabase/systemSettingsService";
import { CalendarRange, Save } from 'lucide-react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface PeriodValue {
  start: string;
  end: string;
}

const SETTING_KEY = (year: number, monthIndex: number) =>
  `submission_period_${year}-${String(monthIndex + 1).padStart(2, '0')}`;

const MonthlySubmissionPeriodsConfig: React.FC = () => {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [periods, setPeriods] = useState<Record<number, PeriodValue>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingMonth, setSavingMonth] = useState<number | null>(null);

  const loadPeriods = async (targetYear: number) => {
    setIsLoading(true);
    try {
      const result: Record<number, PeriodValue> = {};
      await Promise.all(
        MONTHS.map(async (_, idx) => {
          const raw = await systemSettingsService.getSystemSetting(SETTING_KEY(targetYear, idx));
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              result[idx] = { start: parsed.start || '', end: parsed.end || '' };
            } catch {
              result[idx] = { start: '', end: '' };
            }
          } else {
            result[idx] = { start: '', end: '' };
          }
        })
      );
      setPeriods(result);
    } catch (error) {
      console.error('Error loading submission periods:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os períodos de submissão.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPeriods(year);
  }, [year]);

  const updateField = (monthIndex: number, field: 'start' | 'end', value: string) => {
    setPeriods(prev => ({
      ...prev,
      [monthIndex]: { ...prev[monthIndex], [field]: value }
    }));
  };

  const savePeriod = async (monthIndex: number) => {
    const period = periods[monthIndex];
    if (!period) return;
    setSavingMonth(monthIndex);
    try {
      const success = await systemSettingsService.upsertSystemSetting(
        SETTING_KEY(year, monthIndex),
        JSON.stringify({ start: period.start, end: period.end }),
        `Período de submissão de escala — ${MONTHS[monthIndex]} ${year}`
      );
      if (!success) throw new Error('Falha ao guardar');
      toast({
        title: 'Período guardado',
        description: `${MONTHS[monthIndex]} ${year}: ${period.start || '—'} a ${period.end || '—'}`,
      });
    } catch (error) {
      console.error('Error saving period:', error);
      toast({
        title: 'Erro ao guardar',
        description: 'Não foi possível guardar o período.',
        variant: 'destructive',
      });
    } finally {
      setSavingMonth(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="h-6 w-6" />
            Períodos de Submissão da Escala
          </CardTitle>
          <CardDescription>
            Defina o intervalo de dias em que cada escala mensal pode ser submetida pelos utilizadores.
            Estas datas serão mostradas no banner de aviso ao utilizador.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex items-center gap-3 mb-6">
            <Label htmlFor="year-select" className="font-medium">Ano:</Label>
            <Input
              id="year-select"
              type="number"
              min={2024}
              max={2100}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || currentYear)}
              className="w-32"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {MONTHS.map((monthName, idx) => {
                const period = periods[idx] || { start: '', end: '' };
                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-end gap-3 p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="sm:w-40 font-medium text-gray-900">
                      Escala {monthName}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`start-${idx}`} className="text-xs text-gray-600">
                          Data início
                        </Label>
                        <Input
                          id={`start-${idx}`}
                          type="date"
                          value={period.start}
                          onChange={(e) => updateField(idx, 'start', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`end-${idx}`} className="text-xs text-gray-600">
                          Data fim
                        </Label>
                        <Input
                          id={`end-${idx}`}
                          type="date"
                          value={period.end}
                          onChange={(e) => updateField(idx, 'end', e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => savePeriod(idx)}
                      disabled={savingMonth === idx}
                      size="sm"
                      className="sm:w-auto"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {savingMonth === idx ? 'A guardar...' : 'Guardar'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MonthlySubmissionPeriodsConfig;
