
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
import { FileText, Trash2, RotateCcw, Calendar } from "lucide-react";
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

const UserSchedules = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userEmails, setUserEmails] = useState<string[]>([]);
  const [viewingUserSchedule, setViewingUserSchedule] = useState<string | null>(null);
  const [viewingUserName, setViewingUserName] = useState<string | null>(null);
  const { toast } = useToast();

  const loadAllSchedules = () => {
    console.log("Loading all schedules for admin view");
    
    // Get unique users with schedules
    const uniqueUsers: string[] = [];
    const processedUsers = new Set();
    const userInfoMap = new Map(); // Store user info for each email
    
    // First, gather all user info from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('userInfo_')) {
        try {
          const userEmail = key.split('_')[1];
          const userData = JSON.parse(localStorage.getItem(key) || '{}');
          if (userData.name) {
            userInfoMap.set(userEmail, userData);
          }
        } catch (error) {
          console.error(`Error processing user info key ${key}:`, error);
        }
      }
    }
    
    // Then find all users with schedules
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('userSchedule_')) {
        try {
          const userEmail = key.split('_')[1];
          if (!processedUsers.has(userEmail)) {
            processedUsers.add(userEmail);
            uniqueUsers.push(userEmail);
          }
        } catch (error) {
          console.error(`Error processing schedule key ${key}:`, error);
        }
      }
    }
    
    setUserEmails(uniqueUsers);
    
    // Get schedule data for these users
    const userScheduleData: any[] = [];
    uniqueUsers.forEach(email => {
      // For each user, find all their schedule keys
      const userScheduleKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`userSchedule_${email}`)) {
          userScheduleKeys.push(key);
        }
      }
      
      // For each user's schedule key, get the schedule data
      userScheduleKeys.forEach(key => {
        try {
          const monthInfo = key.split('_')[2];
          const scheduleData = JSON.parse(localStorage.getItem(key) || '[]');
          
          // Use stored user info if available, otherwise just use email
          let userName = email;
          const userInfo = userInfoMap.get(email);
          if (userInfo && userInfo.name) {
            userName = userInfo.name;
          } else {
            const userDataKey = `userInfo_${email}`;
            if (localStorage.getItem(userDataKey)) {
              try {
                const userData = JSON.parse(localStorage.getItem(userDataKey) || '{}');
                if (userData.name) {
                  userName = userData.name;
                }
              } catch (e) {
                console.error(`Error parsing user info for ${email}:`, e);
              }
            }
          }
          
          // Create a schedule entry for this user and month
          const userSchedule = {
            user: userName,
            email: email,
            month: monthInfo.replace('-', ' '),
            dates: scheduleData.map((item: any) => ({
              date: new Date(item.date),
              shifts: Object.entries(item.shifts)
                .filter(([_, isSelected]) => isSelected === true)
                .map(([shiftName]) => shiftName),
              notes: item.notes || ""
            }))
          };
          
          // Check if this user has any selected shifts
          const hasSelectedShifts = userSchedule.dates.some((dateInfo: any) => 
            dateInfo.shifts && dateInfo.shifts.length > 0
          );
          
          // Only add if user has selected shifts
          if (hasSelectedShifts) {
            userScheduleData.push(userSchedule);
          }
        } catch (error) {
          console.error(`Error processing schedule for key ${key}:`, error);
        }
      });
    });
    
    setSchedules(userScheduleData);
    setIsLoading(false);
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
        
        // Check if this user has any schedules
        let hasSchedule = false;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`userSchedule_${userEmail}`)) {
            hasSchedule = true;
            break;
          }
        }
        
        if (hasSchedule) {
          setViewingUserSchedule(userEmail);
          setViewingUserName(parsedUserInfo.name || userEmail);
        }
      }
    }
    
    // Load all schedules from localStorage
    loadAllSchedules();
    
    // Set up listener for schedule changes
    const handleSchedulesChange = () => {
      console.log("Schedule changed event received");
      loadAllSchedules();
    };
    
    window.addEventListener('schedulesChanged', handleSchedulesChange);
    
    // Set up an interval to check for new schedules periodically
    const intervalTimer = setInterval(() => {
      loadAllSchedules();
    }, 30000);
    
    return () => {
      window.removeEventListener('schedulesChanged', handleSchedulesChange);
      clearInterval(intervalTimer);
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
      // Remove individual user schedules
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`userSchedule_${email}`)) {
          localStorage.removeItem(key);
        }
      }

      // Update UI state
      setSchedules(prev => prev.filter(schedule => schedule.email !== email));
      setUserEmails(prev => prev.filter(e => e !== email));
      setSelectedUsers(prev => prev.filter(e => e !== email));

      // Notify other components
      const event = new CustomEvent('schedulesChanged');
      window.dispatchEvent(event);

      toast({
        title: "Escalas eliminadas",
        description: `As escalas foram eliminadas com sucesso.`,
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
        description: `O contador de edições foi reiniciado com sucesso.`,
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
        // Changed to display username instead of email in PDF export
        doc.text(`Nome de utilizador: ${schedule.email}`, 14, 45);
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

  // Renamed function to reflect that we're getting username now
  const getUserNameFromEmail = (email: string): string => {
    // Try to find user info in localStorage
    const userDataKey = `userInfo_${email}`;
    if (localStorage.getItem(userDataKey)) {
      try {
        const userData = JSON.parse(localStorage.getItem(userDataKey) || '{}');
        if (userData.name) {
          return userData.name;
        }
      } catch (e) {
        console.error(`Error parsing user info for ${email}:`, e);
      }
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
                    const userMonths = new Set();
                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      if (key && key.startsWith(`userSchedule_${email}`)) {
                        const monthInfo = key.split('_')[2];
                        if (monthInfo) {
                          userMonths.add(monthInfo.replace('-', ' '));
                        }
                      }
                    }
                    
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
                          {Array.from(userMonths).map((month, index) => (
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
