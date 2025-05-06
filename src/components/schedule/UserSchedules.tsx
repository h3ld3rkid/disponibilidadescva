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
import { FileText, Trash2, RotateCcw, Calendar, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import ScheduleCalendar from './ScheduleCalendar';
import { scheduleService } from "@/services/supabase/scheduleService";

const UserSchedules = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userEmails, setUserEmails] = useState<string[]>([]);
  const [viewingUserSchedule, setViewingUserSchedule] = useState<string | null>(null);
  const [viewingUserName, setViewingUserName] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
  const [migrationCount, setMigrationCount] = useState(0);
  const { toast } = useToast();

  const loadAllSchedules = async () => {
    console.log("Loading all schedules for admin view");
    setIsLoading(true);
    
    try {
      // Get schedules from Supabase
      const scheduleData = await scheduleService.getUserSchedules();
      
      if (scheduleData && scheduleData.length > 0) {
        setSchedules(scheduleData);
        
        // Extract unique user emails
        const uniqueEmails = Array.from(new Set(scheduleData.map(schedule => schedule.email)));
        setUserEmails(uniqueEmails);
      } else {
        setSchedules([]);
        setUserEmails([]);
      }
    } catch (error) {
      console.error("Error loading schedules:", error);
      toast({
        title: "Erro ao carregar",
        description: "Ocorreu um erro ao carregar as escalas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Get user info
    const storedUser = localStorage.getItem('mysqlConnection');
    if (storedUser) {
      const parsedUserInfo = JSON.parse(storedUser);
      setUserInfo(parsedUserInfo);
      
      // If user is not admin, and has submitted a schedule, show their own schedule immediately
      if (parsedUserInfo.role !== 'admin') {
        const userEmail = parsedUserInfo.email;
        setViewingUserSchedule(userEmail);
        setViewingUserName(parsedUserInfo.name || userEmail);
      }
    }
    
    // Load all schedules from Supabase
    loadAllSchedules();
    
    // Set up real-time subscription for schedule changes
    const unsubscribe = scheduleService.setupRealtimeSubscription(() => {
      console.log("Real-time schedule update detected, refreshing data");
      loadAllSchedules();
    });
    
    return () => {
      // Clean up real-time subscription
      unsubscribe();
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

  const deleteUserSchedules = async (email: string) => {
    try {
      const result = await scheduleService.deleteUserSchedule(email);
      
      if (result.success) {
        // Update UI state
        setSchedules(prev => prev.filter(schedule => schedule.email !== email));
        setUserEmails(prev => prev.filter(e => e !== email));
        setSelectedUsers(prev => prev.filter(e => e !== email));
        
        toast({
          title: "Escalas eliminadas",
          description: `As escalas foram eliminadas com sucesso.`,
        });
      } else {
        throw new Error("Failed to delete schedules");
      }
    } catch (error) {
      console.error("Error deleting schedules:", error);
      toast({
        title: "Erro ao eliminar",
        description: "Ocorreu um erro ao eliminar as escalas.",
        variant: "destructive",
      });
    }
  };

  const resetEditCounter = async (email: string) => {
    try {
      const result = await scheduleService.resetEditCounter(email);
      
      if (result.success) {
        loadAllSchedules();
        
        toast({
          title: "Contador reiniciado",
          description: `O contador de edições foi reiniciado com sucesso.`,
        });
      } else {
        throw new Error("Failed to reset edit counter");
      }
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
        // Changed to display username instead of email in PDF export
        doc.text(`Nome de utilizador: ${schedule.user}`, 14, 45);
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
          ).join(", "),
          dateInfo.notes || ""
        ]);
        
        // Generate schedule table
        autoTable(doc, {
          startY: 75,
          head: [['Data', 'Turnos', 'Notas Pessoais']],
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
            0: { cellWidth: 60 },
            1: { cellWidth: 50 },
            2: { cellWidth: 80 }
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

  const migrateDataToSupabase = async () => {
    setIsMigrating(true);
    try {
      const result = await scheduleService.migrateLocalStorageToSupabase();
      
      if (result.success) {
        setMigrationDone(true);
        setMigrationCount(result.migratedCount);
        toast({
          title: "Migração concluída",
          description: `Foram migrados ${result.migratedCount} registros para o Supabase.`,
        });
        
        // Reload schedules
        loadAllSchedules();
      } else {
        throw new Error("Failed to migrate data");
      }
    } catch (error) {
      console.error("Error migrating data:", error);
      toast({
        title: "Erro na migração",
        description: "Ocorreu um erro ao migrar os dados para o Supabase.",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  // Get username for display
  const getUserNameFromEmail = (email: string): string => {
    // Try to find user in schedules
    const userSchedule = schedules.find(schedule => schedule.email === email);
    if (userSchedule && userSchedule.user) {
      return userSchedule.user;
    }
    return email;
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
          
          <div className="flex items-center gap-2">
            <Button
              onClick={migrateDataToSupabase}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
              disabled={isMigrating || migrationDone}
            >
              <Database className="h-4 w-4" />
              {isMigrating ? 'Migrando...' : 'Migrar dados para Supabase'}
            </Button>
            <Button 
              onClick={loadAllSchedules}
              variant="outline" 
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>
      )}
      
      {migrationDone && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
          <p className="font-medium">Migração concluída com sucesso!</p>
          <p>Foram migrados {migrationCount} registros do localStorage para o Supabase.</p>
        </div>
      )}
      
      {viewingUserSchedule ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Escala de {viewingUserName || getUserNameFromEmail(viewingUserSchedule)}</CardTitle>
              <CardDescription>Visualize a escala detalhada deste utilizador</CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setViewingUserSchedule(null);
                setViewingUserName(null);
              }}
            >
              Voltar à lista
            </Button>
          </CardHeader>
          
          <CardContent>
            <ScheduleCalendar 
              userEmail={viewingUserSchedule} 
              isAdmin={userInfo?.role === 'admin' || false}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Escalas dos Utilizadores</CardTitle>
            <CardDescription>Visualize os utilizadores que submeteram escalas</CardDescription>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="py-10 text-center">
                <div className="animate-pulse text-gray-500">A carregar escalas...</div>
              </div>
            ) : userEmails.length === 0 ? (
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
                    <TableHead>Meses com Escalas</TableHead>
                    {userInfo && userInfo.role === 'admin' && (
                      <TableHead className="w-[200px] text-right">Ações</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userEmails.map((email) => {
                    // Get user name from email
                    const userName = getUserNameFromEmail(email);
                    
                    // Get months for this user
                    const userMonths = Array.from(new Set(
                      schedules
                        .filter(s => s.email === email)
                        .map(s => s.month)
                    ));
                    
                    return (
                      <TableRow key={email}>
                        {userInfo && userInfo.role === 'admin' && (
                          <TableCell>
                            <Checkbox 
                              checked={selectedUsers.includes(email)}
                              onCheckedChange={() => toggleUserSelection(email)}
                              className="ml-1"
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          <Button 
                            variant="link" 
                            className="p-0 h-auto font-medium"
                            onClick={() => {
                              setViewingUserSchedule(email);
                              setViewingUserName(userName);
                            }}
                          >
                            {userName}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {userMonths.map((month) => (
                            <span 
                              key={`${email}-${month}`}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1"
                            >
                              {String(month)}
                            </span>
                          ))}
                        </TableCell>
                        {userInfo && userInfo.role === 'admin' && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  setViewingUserSchedule(email);
                                  setViewingUserName(userName);
                                }}
                                className="h-8 flex items-center"
                              >
                                <Calendar className="h-4 w-4 mr-1" />
                                Ver Escala
                              </Button>
                              
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
                                  <p>Tem a certeza que deseja eliminar as escalas de {userName}?</p>
                                  <DialogFooter>
                                    <Button 
                                      variant="destructive" 
                                      onClick={() => deleteUserSchedules(email)}
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
                                  <p>Deseja reiniciar o contador de edições para {userName}?</p>
                                  <DialogFooter>
                                    <Button 
                                      onClick={() => resetEditCounter(email)}
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
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserSchedules;
