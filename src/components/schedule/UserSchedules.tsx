
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
import { FileText, Trash2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

const UserSchedules = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { toast } = useToast();

  const loadAllSchedules = () => {
    console.log("Loading all schedules for admin view");
    const storedSchedules = localStorage.getItem('userSchedules');
    if (storedSchedules) {
      try {
        const parsedSchedules = JSON.parse(storedSchedules);
        console.log(`Found ${parsedSchedules.length} schedules in localStorage`);
        
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
      console.log("No schedules found in localStorage");
      setSchedules([]);
    }
    setIsLoading(false);
  };

  // Modified to prevent duplicates by tracking already processed schedules
  const loadIndividualSchedules = () => {
    const allUserSchedules: any[] = [];
    const processedKeys = new Set(); // Track processed keys to avoid duplicates
    
    // Collect schedules from users' individual storage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('userSchedule_') && !processedKeys.has(key)) {
        processedKeys.add(key);
        try {
          const userEmail = key.split('_')[1];
          const monthInfo = key.split('_')[2];
          
          const scheduleData = JSON.parse(localStorage.getItem(key) || '[]');
          
          // Create a schedule entry for this user
          const userSchedule = {
            user: userEmail,
            email: userEmail,
            month: monthInfo.replace('-', ' '),
            dates: scheduleData.map((item: any) => ({
              date: new Date(item.date),
              shifts: Object.entries(item.shifts)
                .filter(([_, isSelected]) => isSelected === true)
                .map(([shiftName]) => shiftName)
            }))
          };
          
          allUserSchedules.push(userSchedule);
        } catch (error) {
          console.error(`Error processing schedule for key ${key}:`, error);
        }
      }
    }
    
    if (allUserSchedules.length > 0) {
      console.log(`Found ${allUserSchedules.length} individual user schedules`);
      
      // Merge with existing schedules from combined storage
      // Create a map of existing schedules by email and month to avoid duplicates
      const existingScheduleMap = new Map();
      schedules.forEach(s => {
        existingScheduleMap.set(`${s.email}_${s.month}`, true);
      });
      
      // Only add schedules that aren't already in the list
      const newSchedules = allUserSchedules.filter(s => 
        !existingScheduleMap.has(`${s.email}_${s.month}`)
      );
      
      if (newSchedules.length > 0) {
        setSchedules(prev => [...prev, ...newSchedules]);
        console.log(`Added ${newSchedules.length} new schedules from individual storage`);
      }
    }
  };

  useEffect(() => {
    // Get user info
    const storedUser = localStorage.getItem('mysqlConnection');
    if (storedUser) {
      setUserInfo(JSON.parse(storedUser));
    }
    
    // Load all schedules from localStorage
    loadAllSchedules();
    
    // Also check for individual schedules with a delay to ensure they don't overlap
    const timer = setTimeout(() => {
      loadIndividualSchedules();
    }, 500);
    
    // Set up listener for schedule changes
    const handleSchedulesChange = () => {
      console.log("Schedule changed event received");
      
      // Clear schedules first to avoid duplication
      setSchedules([]);
      
      // Then load them with a delay between the two methods
      loadAllSchedules();
      
      // Wait before loading individual schedules to avoid race conditions
      setTimeout(() => {
        loadIndividualSchedules();
      }, 500);
    };
    
    window.addEventListener('schedulesChanged', handleSchedulesChange);
    
    // Set up an interval to check for new schedules periodically
    const intervalTimer = setInterval(() => {
      // Clear schedules first to avoid duplication on refresh
      setSchedules([]);
      loadAllSchedules();
      
      setTimeout(() => {
        loadIndividualSchedules();
      }, 500);
    }, 30000);
    
    return () => {
      window.removeEventListener('schedulesChanged', handleSchedulesChange);
      clearInterval(intervalTimer);
      clearTimeout(timer);
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

  const deleteUserSchedules = (email: string) => {
    try {
      // First remove from combined storage
      const storedSchedules = localStorage.getItem('userSchedules');
      if (storedSchedules) {
        const parsedSchedules = JSON.parse(storedSchedules);
        const updatedSchedules = parsedSchedules.filter((s: any) => s.email !== email);
        localStorage.setItem('userSchedules', JSON.stringify(updatedSchedules));
      }

      // Then remove individual user schedules
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`userSchedule_${email}`)) {
          localStorage.removeItem(key);
        }
      }

      // Update UI state
      setSchedules(prev => prev.filter(schedule => schedule.email !== email));
      setSelectedUsers(prev => prev.filter(e => e !== email));

      // Notify other components
      const event = new CustomEvent('schedulesChanged');
      window.dispatchEvent(event);

      toast({
        title: "Escalas eliminadas",
        description: `As escalas de ${email} foram eliminadas com sucesso.`,
      });
    } catch (error) {
      console.error("Error deleting schedules:", error);
      toast({
        title: "Erro ao eliminar",
        description: "Ocorreu um erro ao eliminar as escalas.",
        variant: "destructive",
      });
    }
  };

  const resetEditCounter = (email: string) => {
    try {
      // Find all edit counters for this user
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`editCount_${email}`)) {
          localStorage.setItem(key, '0');
        }
      }

      toast({
        title: "Contador reiniciado",
        description: `O contador de edições de ${email} foi reiniciado com sucesso.`,
      });

      // Notify other components
      const event = new CustomEvent('schedulesChanged');
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Error resetting edit counter:", error);
      toast({
        title: "Erro ao reiniciar",
        description: "Ocorreu um erro ao reiniciar o contador.",
        variant: "destructive",
      });
    }
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
                  {userInfo && userInfo.role === 'admin' && (
                    <TableHead className="w-[150px] text-right">Ações</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.flatMap((schedule) => 
                  schedule.dates.map((dateInfo: any, dateIndex: number) => (
                    <TableRow key={`${schedule.email}-${dateIndex}-${schedule.month}`}>
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
                      {dateIndex === 0 && userInfo && userInfo.role === 'admin' && (
                        <TableCell rowSpan={schedule.dates.length} className="text-right">
                          <div className="flex justify-end gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  className="h-8 flex items-center"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Eliminar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Confirmar eliminação</DialogTitle>
                                </DialogHeader>
                                <p>Tem a certeza que deseja eliminar as escalas de {schedule.email}?</p>
                                <DialogFooter>
                                  <Button 
                                    variant="destructive" 
                                    onClick={() => deleteUserSchedules(schedule.email)}
                                  >
                                    Eliminar
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 flex items-center"
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Resetar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reiniciar contador</DialogTitle>
                                </DialogHeader>
                                <p>Deseja reiniciar o contador de edições para {schedule.email}?</p>
                                <DialogFooter>
                                  <Button 
                                    onClick={() => resetEditCounter(schedule.email)}
                                  >
                                    Reiniciar (0/2)
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      )}
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
