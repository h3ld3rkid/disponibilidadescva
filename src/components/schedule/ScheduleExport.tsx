
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Download, Loader2 } from "lucide-react";

interface ScheduleExportProps {
  userSchedules: any[];
}

const ScheduleExport = ({ userSchedules }: ScheduleExportProps) => {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Datas em falta",
        description: "Por favor selecione uma data de início e fim",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      // Filter schedules within date range
      const filteredSchedules = userSchedules.flatMap(schedule => 
        schedule.dates
          .filter((dateInfo: any) => {
            const scheduleDate = new Date(dateInfo.date);
            return scheduleDate >= startDate && scheduleDate <= endDate;
          })
          .map((dateInfo: any) => ({
            user: schedule.user,
            email: schedule.email,
            date: format(new Date(dateInfo.date), "dd/MM/yyyy"),
            shifts: dateInfo.shifts.map((shift: string) => 
              shift === "manha" ? "Manhã" : 
              shift === "tarde" ? "Tarde" : "Noite"
            ).join(", "),
          }))
      );

      if (filteredSchedules.length === 0) {
        toast({
          title: "Nenhuma escala encontrada",
          description: "Não existem escalas no período selecionado",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      // Create CSV content
      const csvHeaders = ["Utilizador", "Email", "Data", "Turnos"];
      const csvRows = [
        csvHeaders.join(","),
        ...filteredSchedules.map(row => 
          [
            `"${row.user}"`,
            `"${row.email}"`,
            `"${row.date}"`,
            `"${row.shifts}"`
          ].join(",")
        )
      ];
      
      const csvContent = csvRows.join("\n");
      
      // Create and download CSV file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `escalas_${format(startDate, "dd-MM-yyyy")}_a_${format(endDate, "dd-MM-yyyy")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Exportação concluída",
        description: "O ficheiro CSV foi gerado com sucesso",
      });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao exportar as escalas",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Exportar Escalas</CardTitle>
        <CardDescription>Exporte as escalas dos utilizadores num intervalo de datas em formato CSV</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Data de Início</h3>
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              locale={pt}
              className="border rounded-md"
            />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Data de Fim</h3>
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={setEndDate}
              locale={pt}
              className="border rounded-md"
            />
          </div>
        </div>
        
        <Button 
          onClick={handleExportCSV} 
          className="mt-6 bg-brand-indigo hover:bg-brand-darkblue"
          disabled={isExporting || !startDate || !endDate}
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A exportar...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ScheduleExport;
