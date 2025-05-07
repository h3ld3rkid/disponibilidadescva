
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { scheduleService } from "@/services/supabase/scheduleService";
import UserSchedulesHeader from './UserSchedulesHeader';
import MigrationStatus from './MigrationStatus';
import UserScheduleViewer from './UserScheduleViewer';
import UserScheduleList from './UserScheduleList';
import { exportSchedulesToPDF } from './UserScheduleUtils';

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

  const handleExportPDF = () => {
    exportSchedulesToPDF(selectedUsers, schedules, toast);
  };

  const handleViewSchedule = (email: string, name: string) => {
    setViewingUserSchedule(email);
    setViewingUserName(name);
  };

  const handleBackToList = () => {
    setViewingUserSchedule(null);
    setViewingUserName(null);
  };

  const isAdmin = userInfo?.role === 'admin';

  return (
    <div className="container mx-auto px-4 py-8">
      {isAdmin && (
        <UserSchedulesHeader 
          isAdmin={isAdmin}
          selectedUsers={selectedUsers}
          isMigrating={isMigrating}
          migrationDone={migrationDone}
          onExportPDF={handleExportPDF}
          onMigrateData={migrateDataToSupabase}
          onRefresh={loadAllSchedules}
        />
      )}
      
      <MigrationStatus 
        migrationDone={migrationDone}
        migrationCount={migrationCount}
      />
      
      {viewingUserSchedule ? (
        <UserScheduleViewer 
          userEmail={viewingUserSchedule}
          userName={viewingUserName}
          getUserNameFromEmail={getUserNameFromEmail}
          isAdmin={isAdmin}
          onBack={handleBackToList}
        />
      ) : (
        <UserScheduleList 
          isLoading={isLoading}
          userEmails={userEmails}
          userInfo={userInfo}
          toggleUserSelection={toggleUserSelection}
          selectedUsers={selectedUsers}
          schedules={schedules}
          onViewSchedule={handleViewSchedule}
          onDeleteSchedule={deleteUserSchedules}
          onResetEditCounter={resetEditCounter}
          getUserNameFromEmail={getUserNameFromEmail}
        />
      )}
    </div>
  );
};

export default UserSchedules;
