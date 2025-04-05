
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
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

const UserSchedules = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { toast } = useToast();

  const loadAllSchedules = () => {
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
  };

  useEffect(() => {
    // Get user info
    const storedUser = localStorage.getItem('mysqlConnection');
    if (storedUser) {
      setUserInfo(JSON.parse(storedUser));
    }
    
    // Load all schedules from localStorage
    loadAllSchedules();
    
    // Set up listener for schedule changes
    const handleSchedulesChange = () => {
      loadAllSchedules();
    };
    
    window.addEventListener('schedulesChanged', handleSchedulesChange);
    
    // Set up an interval to check for new schedules every 30 seconds
    const timer = setInterval(loadAllSchedules, 30000);
    
    return () => {
      window.removeEventListener('schedulesChanged', handleSchedulesChange);
      clearInterval(timer);
    };
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

  const exportSelectedToPDF = () => {
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

    try {
      // Create PDF document with one user per page
      const doc = new jsPDF();
      
      // Loop through each selected user
      filteredSchedules.forEach((schedule, userIndex) => {
        // Add a new page for each user after the first one
        if (userIndex > 0) {
          doc.addPage();
        }
        
        // Add title and header
        doc.setFontSize(18);
        doc.setTextColor(0, 51, 102);
        doc.text("Escalas Cruz Vermelha Amares", 14, 20);
        
        // Add user info
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`Utilizador: ${schedule.user}`, 14, 35);
        doc.text(`Email: ${schedule.email}`, 14, 45);
        doc.text(`Mês: ${schedule.month}`, 14, 55);
        
        // Date and export info
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Data de exportação: ${format(new Date(), "dd/MM/yyyy")}`, 14, 65);
        
        // Sort dates chronologically
        const sortedDates = [...schedule.dates].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        // Prepare table data
        const tableData = sortedDates.map((dateInfo: any) => [
          format(new Date(dateInfo.date), "d 'de' MMMM", { locale: pt }),
          dateInfo.shifts.map((shift: string) => 
            shift === "manha" ? "Manhã" : 
            shift === "tarde" ? "Tarde" : "Noite"
          ).join(", ")
        ]);
        
        // Generate schedule table
        autoTable(doc, {
          startY: 75,
          head: [['Data', 'Turnos']],
          body: tableData,
          theme: 'grid',
          headStyles: { 
            fillColor: [110, 89, 165],
            textColor: 255 
          },
          styles: {
            cellPadding: 5,
            fontSize: 10
          },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 70 }
          }
        });
      });
      
      // Save the PDF
      doc.save(`escalas_utilizadores_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: "Exportação concluída",
        description: `Exportados dados de ${selectedUsers.length} utilizador(es) em formato PDF.`,
      });
    } catch (error) {
      console.error("Erro ao exportar para PDF:", error);
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao exportar as escalas",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {userInfo && userInfo.role === 'admin' && (
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={exportSelectedToPDF}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              disabled={selectedUsers.length === 0}
            >
              <FileText className="h-4 w-4" />
              Exportar PDF
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
