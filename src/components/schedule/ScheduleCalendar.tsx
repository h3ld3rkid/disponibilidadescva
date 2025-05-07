
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addMonths, isAfter } from "date-fns";
import { scheduleService } from "@/services/supabase/scheduleService";
import { pt } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MigrationStatus } from "@/components/schedule/MigrationStatus";
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
import { Save } from "lucide-react";

interface ScheduleCalendarProps {
  userEmail: string;
  isAdmin?: boolean;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ userEmail, isAdmin = false }) => {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [nextMonth, setNextMonth] = useState<Date>(addMonths(new Date(), 1));
  const [userNotes, setUserNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const { toast } = useToast();
  const [editCount, setEditCount] = useState<number>(0);
  const [userName, setUserName] = useState<string>(userEmail);
  const [isLocalStorageMigrated, setIsLocalStorageMigrated] = useState<boolean>(false);
  const [migrationCount, setMigrationCount] = useState<number>(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [scheduleRuleLocked, setScheduleRuleLocked] = useState<boolean>(false);

  const monthKey = format(nextMonth, 'MMMM-yyyy', { locale: pt });

  // Check if schedule editing is allowed (before the 15th of previous month)
  useEffect(() => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    
    // If it's after the 15th of the current month and user is not admin
    if (dayOfMonth > 15 && !isAdmin) {
      setScheduleRuleLocked(true);
    } else {
      setScheduleRuleLocked(false);
    }
  }, [isAdmin]);

  // Load user schedule from Supabase
  const loadUserSchedule = useCallback(async () => {
    try {
      console.log(`Loading schedule for ${userEmail} (${monthKey})`);
      const schedules = await scheduleService.getUserSchedules();
      const schedule = schedules.find(s => s.email === userEmail && s.month === monthKey);
      
      if (schedule) {
        console.log('Found schedule:', schedule);
        setSelectedDates(schedule.dates.map((date: string) => new Date(date)));
        setUserNotes(schedule.notes || '');
        setEditCount(schedule.editCount || 0);
        setUserName(schedule.user || userEmail);
        console.log(`Loaded schedule for ${userEmail} with ${schedule.dates.length} dates`);
      } else {
        setSelectedDates([]);
        setUserNotes('');
        setEditCount(0);
        console.log(`No schedule found for ${userEmail} (${monthKey})`);
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
          setMigrationCount(migratedCount);
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
        if (parsedUser && parsedUser.name) {
          setUserName(parsedUser.name);
        }
      } catch (error) {
        console.error("Error parsing user info:", error);
      }
    }
  }, [userEmail]);

  // Save schedule and notes to Supabase
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // Format dates as ISO strings for storage
      const dates = selectedDates.map(date => date.toISOString());
      
      // Prepare schedule data
      const scheduleData = {
        month: monthKey,
        dates: dates
      };
      
      // Get user name for display
      const userData = { name: userName || userEmail };
      
      console.log('Saving schedule data and notes:', scheduleData);
      
      // Save to Supabase
      const { success } = await scheduleService.saveUserScheduleWithNotes(userEmail, scheduleData, userNotes, userData);
      
      if (success) {
        toast({
          title: "Escala guardada",
          description: "A sua escala e notas foram guardadas com sucesso.",
        });
        // Update edit count locally
        setEditCount(prevCount => prevCount + 1);
        
        // Trigger an update after saving
        window.dispatchEvent(new Event('schedulesChanged'));
        
        // Force reload
        loadUserSchedule();
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
          description: "A escala foi apagada com sucesso.",
        });
        setSelectedDates([]);
        setUserNotes('');
        setEditCount(0);
        
        // Trigger event to notify other components
        window.dispatchEvent(new Event('schedulesChanged'));
      } else {
        toast({
          title: "Erro ao apagar",
          description: "Ocorreu um erro ao apagar a escala.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast({
        title: "Erro ao apagar",
        description: "Ocorreu um erro ao apagar a escala.",
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
        
        // Trigger event to notify other components
        window.dispatchEvent(new Event('schedulesChanged'));
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
      console.log(`Saving notes for ${userEmail} (${monthKey}): ${userNotes}`);
      const { success } = await scheduleService.saveUserNotes(userEmail, monthKey, userNotes);
      if (success) {
        toast({
          title: "Notas guardadas",
          description: "As suas notas foram guardadas com sucesso.",
        });
        
        // Trigger event to notify other components
        window.dispatchEvent(new Event('schedulesChanged'));
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

  // Handle date selection with proper typing
  const handleDateSelect = (dates: Date[] | undefined) => {
    if (!dates) return;
    
    // If user is not admin and schedule is locked, don't allow changes
    if (!isAdmin && scheduleRuleLocked) {
      toast({
        title: "Edição bloqueada",
        description: "A edição da escala só é permitida até o dia 15 do mês anterior.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedDates(dates);
    console.log(`Selected ${dates.length} dates`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <MigrationStatus 
        migrationDone={isLocalStorageMigrated} 
        migrationCount={migrationCount} 
        showScheduleRule={scheduleRuleLocked}
        isAdmin={isAdmin}
      />
      
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardContent className="grid gap-4 pt-4">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={handleDateSelect}
                defaultMonth={nextMonth}
                month={nextMonth}
                onMonthChange={setNextMonth}
                disabled={false}
                className="w-full"
              />
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <p>
              Total de dias selecionados: {selectedDates.length}
            </p>
            <div>
              <Button
                onClick={handleSaveAll}
                disabled={isSaving || (!isAdmin && scheduleRuleLocked)}
                className="bg-[#6E59A5] hover:bg-[#5d4a8b]"
              >
                <Save className="mr-2" />
                {isSaving ? "A guardar..." : "Guardar Escala e Notas"}
              </Button>
              {isAdmin && (
                <p className="mt-2">
                  <Label>Nome do utilizador: {userName}</Label>
                  <br />
                  <Label>Email do utilizador: {userEmail}</Label>
                </p>
              )}
            </div>
          </div>
          
          {/* Add notes textarea at the bottom of the calendar */}
          <div className="mt-6 space-y-2">
            <Label htmlFor="calendar-notes">Notas da Escala:</Label>
            <Textarea
              id="calendar-notes"
              placeholder="Adicione notas sobre esta escala..."
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              rows={4}
              className="w-full"
              disabled={(!isAdmin && scheduleRuleLocked)}
            />
          </div>
        </TabsContent>
        <TabsContent value="notes" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notas adicionais:</Label>
            <Textarea
              id="notes"
              placeholder="Adicione notas sobre a sua escala..."
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              rows={6}
              className="w-full"
              disabled={(!isAdmin && scheduleRuleLocked)}
            />
          </div>
          <Button
            onClick={handleSaveAll}
            disabled={isSaving || (!isAdmin && scheduleRuleLocked)}
            className="bg-[#6E59A5] hover:bg-[#5d4a8b]"
          >
            <Save className="mr-2" />
            {isSaving ? "A guardar..." : "Guardar Escala e Notas"}
          </Button>
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
