
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const UserSchedules = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Get user info
    const storedUser = localStorage.getItem('mysqlConnection');
    if (storedUser) {
      setUserInfo(JSON.parse(storedUser));
    }
    
    // Load schedules from localStorage
    const storedSchedules = localStorage.getItem('userSchedules');
    if (storedSchedules) {
      try {
        const parsedSchedules = JSON.parse(storedSchedules);
        // Process dates to be Date objects
        const processedSchedules = parsedSchedules.map((schedule: any) => ({
          ...schedule,
          dates: schedule.dates.map((dateInfo: any) => ({
            ...dateInfo,
            date: new Date(dateInfo.date)
          }))
        }));
        setSchedules(processedSchedules);
      } catch (error) {
        console.error('Erro ao processar escalas:', error);
        setSchedules([]);
      }
    } else {
      setSchedules([]);
    }
    setIsLoading(false);
  }, []);

  const toggleUserSelection = (email: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(email)) {
        return prev.filter(e => e !== email);
      } else {
        return [...prev, email];
      }
    });
  };

  const exportSelectedToCSV = () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Nenhum utilizador selecionado",
        description: "Por favor, selecione pelo menos um utilizador para exportar.",
        variant: "destructive",
      });
      return;
    }

    const filteredSchedules = schedules.filter(schedule => 
      selectedUsers.includes(schedule.email)
    );

    // Create CSV content with organized format
    let csvContent = "Nome,Email,Mês,Data,Turnos\n";
    
    // Organize by user and date
    const organizedData: Record<string, Record<string, { user: string, email: string, month: string, shifts: string[] }>> = {};

    filteredSchedules.forEach(schedule => {
      const userEmail = schedule.email;
      if (!organizedData[userEmail]) {
        organizedData[userEmail] = {};
      }

      schedule.dates.forEach((dateInfo: any) => {
        const dateStr = format(new Date(dateInfo.date), "yyyy-MM-dd");
        const formattedDate = format(new Date(dateInfo.date), "d 'de' MMMM", { locale: pt });
        
        const shiftsText = dateInfo.shifts.map((shift: string) => 
          shift === "manha" ? "Manhã" : shift === "tarde" ? "Tarde" : "Noite"
        );

        organizedData[userEmail][dateStr] = {
          user: schedule.user,
          email: schedule.email,
          month: schedule.month,
          shifts: shiftsText
        };
      });
    });

    // Convert organized data to CSV rows
    Object.values(organizedData).forEach(userDates => {
      // Sort dates chronologically
      const sortedDates = Object.keys(userDates).sort();
      
      sortedDates.forEach(dateStr => {
        const data = userDates[dateStr];
        const formattedDate = format(new Date(dateStr), "d 'de' MMMM", { locale: pt });
        const shiftsText = data.shifts.join(" + ");
        
        csvContent += `${data.user},${data.email},${data.month},${formattedDate},${shiftsText}\n`;
      });
    });

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `escalas_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Exportação concluída",
      description: `Exportados dados de ${selectedUsers.length} utilizadores.`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {userInfo && userInfo.role === 'admin' && (
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={exportSelectedToCSV}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              disabled={selectedUsers.length === 0}
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <span className="text-sm text-gray-600">
              {selectedUsers.length} utilizador(es) selecionado(s)
            </span>
          </div>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Escalas dos Utilizadores</CardTitle>
          <CardDescription>Visualize todas as escalas submetidas pelos utilizadores</CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center">
              <div className="animate-pulse text-gray-500">A carregar escalas...</div>
            </div>
          ) : schedules.length === 0 ? (
            <div className="py-10 text-center">
              <div className="text-gray-500">Não existem escalas submetidas.</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {userInfo && userInfo.role === 'admin' && (
                    <TableHead className="w-[50px]"></TableHead>
                  )}
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mês</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Turnos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.flatMap((schedule) => 
                  schedule.dates.map((dateInfo: any, dateIndex: number) => (
                    <TableRow key={`${schedule.email}-${dateIndex}`}>
                      {dateIndex === 0 && userInfo && userInfo.role === 'admin' && (
                        <TableCell rowSpan={schedule.dates.length} className="align-middle">
                          <Checkbox 
                            checked={selectedUsers.includes(schedule.email)}
                            onCheckedChange={() => toggleUserSelection(schedule.email)}
                            className="ml-1"
                          />
                        </TableCell>
                      )}
                      {dateIndex === 0 ? (
                        <>
                          <TableCell rowSpan={schedule.dates.length} className="font-medium">{schedule.user}</TableCell>
                          <TableCell rowSpan={schedule.dates.length}>{schedule.email}</TableCell>
                          <TableCell rowSpan={schedule.dates.length}>{schedule.month}</TableCell>
                        </>
                      ) : null}
                      <TableCell>{format(new Date(dateInfo.date), "d 'de' MMMM", { locale: pt })}</TableCell>
                      <TableCell>
                        {dateInfo.shifts.map((shift: string) => (
                          <span key={shift} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1">
                            {shift === "manha" ? "Manhã" : shift === "tarde" ? "Tarde" : "Noite"}
                          </span>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserSchedules;
