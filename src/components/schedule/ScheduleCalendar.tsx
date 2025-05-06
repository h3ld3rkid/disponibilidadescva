import React, { useState, useEffect, useCallback } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { scheduleService } from "@/services/supabase/scheduleService";
import { pt } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ScheduleCalendarProps {
  userEmail: string;
  isAdmin?: boolean;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ userEmail, isAdmin = false }) => {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [userSchedule, setUserSchedule] = useState<any[]>([]);
  const [userNotes, setUserNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const { toast } = useToast();
  const [editCount, setEditCount] = useState<number>(0);
  const [userName, setUserName] = useState<string>(userEmail);
  const [isLocalStorageMigrated, setIsLocalStorageMigrated] = useState<boolean>(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  const monthKey = format(currentMonth, 'MMMM-yyyy', { locale: pt });

  // Load user schedule from Supabase
  const loadUserSchedule = useCallback(async () => {
    try {
      const schedules = await scheduleService.getUserSchedules();
      const schedule = schedules.find(s => s.email === userEmail && s.month === monthKey);
      
      if (schedule) {
        setSelectedDates(schedule.dates.map(date => new Date(date)));
        setUserNotes(schedule.notes || '');
        setEditCount(schedule.editCount || 0);
        setUserName(schedule.user);
        console.log(`Supabase: Loaded schedule for ${userEmail} (${monthKey})`, schedule);
      } else {
        setSelectedDates([]);
        setUserNotes('');
        setEditCount(0);
        console.log(`Supabase: No schedule found for ${userEmail} (${monthKey})`);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      toast({
        title: "Erro ao carregar",
        description: "Ocorreu um erro ao carregar a escala.",
        variant: "destructive",
      });
    }
  }, [userEmail, monthKey, toast]);

  useEffect(() => {
    loadUserSchedule();
    
    // Set up real-time subscription for schedule changes
    const unsubscribe = scheduleService.setupRealtimeSubscription(() => {
      console.log("Realtime schedule update detected, refreshing calendar");
      loadUserSchedule();
      setForceUpdate(prev => prev + 1);
    });
    
    return () => {
      // Clean up subscription
      unsubscribe();
    };
  }, [loadUserSchedule]);

  // Migrate local storage data to Supabase on first load
  useEffect(() => {
    const migrateLocalStorage = async () => {
      if (!isLocalStorageMigrated) {
        console.log('Attempting to migrate localStorage data to Supabase');
        const { success, migratedCount } = await scheduleService.migrateLocalStorageToSupabase();
        if (success) {
          toast({
            title: "Migração concluída",
            description: `Migrados ${migratedCount} registos do armazenamento local para o Supabase.`,
          });
          setIsLocalStorageMigrated(true);
        } else {
          toast({
            title: "Erro na migração",
            description: "Ocorreu um erro ao migrar os dados do armazenamento local.",
            variant: "destructive",
          });
        }
      }
    };
    
    migrateLocalStorage();
  }, [toast, isLocalStorageMigrated]);

  // Load user info from local storage
  useEffect(() => {
    const storedUser = localStorage.getItem(`userInfo_${userEmail}`);
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserName(parsedUser.name || userEmail);
      } catch (error) {
        console.error("Error parsing user info:", error);
      }
    }
  }, [userEmail]);

  // Save schedule to Supabase
  const handleSaveSchedule = async () => {
    setIsSaving(true);
    try {
      const dates = selectedDates.map(date => date.toISOString());
      const scheduleData = {
        month: monthKey,
        dates: dates
      };
      
      const userData = { name: userName };
      
      const { success } = await scheduleService.saveUserSchedule(userEmail, scheduleData, userData);
      
      if (success) {
        toast({
          title: "Escala guardada",
          description: "A sua escala foi guardada com sucesso.",
        });
        setEditCount(prevCount => prevCount + 1);
      } else {
        toast({
          title: "Erro ao guardar",
          description: "Ocorreu um erro ao guardar a sua escala.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast({
        title: "Erro ao guardar",
        description: "Ocorreu um erro ao guardar a sua escala.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete schedule from Supabase
  const handleDeleteSchedule = async () => {
    setIsDeleting(true);
    try {
      const { success } = await scheduleService.deleteUserSchedule(userEmail);
      if (success) {
        toast({
          title: "Escala apagada",
          description: "A sua escala foi apagada com sucesso.",
        });
        setSelectedDates([]);
        setUserNotes('');
        setEditCount(0);
      } else {
        toast({
          title: "Erro ao apagar",
          description: "Ocorreu um erro ao apagar a sua escala.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast({
        title: "Erro ao apagar",
        description: "Ocorreu um erro ao apagar a sua escala.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset edit counter
  const handleResetEditCounter = async () => {
    try {
      const { success } = await scheduleService.resetEditCounter(userEmail);
      if (success) {
        toast({
          title: "Contador de edições reiniciado",
          description: "O contador de edições foi reiniciado com sucesso.",
        });
        setEditCount(0);
      } else {
        toast({
          title: "Erro ao reiniciar contador",
          description: "Ocorreu um erro ao reiniciar o contador de edições.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error resetting edit counter:", error);
      toast({
        title: "Erro ao reiniciar contador",
        description: "Ocorreu um erro ao reiniciar o contador de edições.",
        variant: "destructive",
      });
    }
  };

  // Save notes to Supabase
  const handleSaveNotes = async () => {
    try {
      const { success } = await scheduleService.saveUserNotes(userEmail, monthKey, userNotes);
      if (success) {
        toast({
          title: "Notas guardadas",
          description: "As suas notas foram guardadas com sucesso.",
        });
      } else {
        toast({
          title: "Erro ao guardar notas",
          description: "Ocorreu um erro ao guardar as suas notas.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving notes:", error);
      toast({
        title: "Erro ao guardar notas",
        description: "Ocorreu um erro ao guardar as suas notas.",
        variant: "destructive",
      });
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const dateString = date.toISOString();
    const isSelected = selectedDates.some(selectedDate => selectedDate.toISOString() === dateString);

    if (isSelected) {
      setSelectedDates(prevDates => prevDates.filter(selectedDate => selectedDate.toISOString() !== dateString));
    } else {
      setSelectedDates(prevDates => [...prevDates, date]);
    }
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some(selectedDate => selectedDate.toISOString() === date.toISOString());
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardContent className="grid gap-4">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={handleDateSelect}
                defaultMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                disabled={isAdmin ? true : false}
                modifiers={{
                  selected: isDateSelected,
                }}
              />
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <p>
              Total de dias selecionados: {selectedDates.length}
            </p>
            <div>
              {!isAdmin && (
                <Button
                  onClick={handleSaveSchedule}
                  disabled={isSaving}
                  className="bg-[#6E59A5] hover:bg-[#5d4a8b]"
                >
                  {isSaving ? "A guardar..." : "Guardar Escala"}
                </Button>
              )}
              {isAdmin && (
                <p>
                  <Label>Nome do utilizador: {userName}</Label>
                  <br />
                  <Label>Email do utilizador: {userEmail}</Label>
                </p>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="notes" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notas adicionais:</Label>
            <Input
              id="notes"
              placeholder="Adicione notas sobre a sua escala..."
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              disabled={isAdmin ? true : false}
            />
          </div>
          {!isAdmin && (
            <Button
              onClick={handleSaveNotes}
              className="bg-[#6E59A5] hover:bg-[#5d4a8b]"
            >
              Guardar Notas
            </Button>
          )}
        </TabsContent>
        <TabsContent value="admin" className="space-y-4">
          {isAdmin && (
            <div className="space-y-4">
              <p>
                Contador de edições: {editCount}
              </p>
              <Button
                onClick={handleResetEditCounter}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Reset Edit Counter
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Apagar Escala</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá apagar a escala deste utilizador permanentemente.
                      Tem a certeza que quer continuar?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSchedule} disabled={isDeleting}>
                      {isDeleting ? "A apagar..." : "Apagar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ScheduleCalendar;
