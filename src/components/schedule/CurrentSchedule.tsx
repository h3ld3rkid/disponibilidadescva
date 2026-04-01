
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText } from "lucide-react";
import { systemSettingsService } from "@/services/supabase/systemSettingsService";

interface CurrentScheduleProps {
  isAdmin?: boolean;
}

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

const CurrentSchedule: React.FC<CurrentScheduleProps> = ({ isAdmin = false }) => {
  const [monthLinks, setMonthLinks] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLinks = async () => {
      try {
        const links: Record<string, string> = {};
        await Promise.all(
          MONTHS.map(async (month) => {
            const url = await systemSettingsService.getSystemSetting(`schedule_link_${month.key}`);
            if (url) links[month.key] = url;
          })
        );
        setMonthLinks(links);
      } catch (error) {
        console.error('Error loading schedule links:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadLinks();
  }, []);

  const currentMonth = new Date().getMonth(); // 0-indexed

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Escala</CardTitle>
          <CardDescription>
            Selecione o mês para consultar a escala correspondente
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">A carregar...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {MONTHS.map((month, index) => {
                const link = monthLinks[month.key];
                const isCurrent = index === currentMonth;
                
                return (
                  <Button
                    key={month.key}
                    variant={isCurrent ? "default" : "outline"}
                    className={`h-16 sm:h-20 flex flex-col items-center justify-center gap-1 text-sm sm:text-base ${
                      !link ? 'opacity-50 cursor-not-allowed' : ''
                    } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    disabled={!link}
                    onClick={() => {
                      if (link) window.open(link, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    {link ? (
                      <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                    <span>{month.label}</span>
                  </Button>
                );
              })}
            </div>
          )}
          
          {!isLoading && Object.keys(monthLinks).length === 0 && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Nenhum ficheiro de escala configurado de momento.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CurrentSchedule;
