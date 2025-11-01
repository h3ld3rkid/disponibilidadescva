import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { scheduleService } from "@/services/supabase/scheduleService";
import { userService } from "@/services/supabase/userService";
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
  const [allUsers, setAllUsers] = useState<any[]>([]);
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

      // Load all users to get names and mechanographic numbers
      const users = await userService.getAllUsers();
      setAllUsers(users);
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

  const selectAllUsers = () => {
    setSelectedUsers(userEmails);
  };

  const deselectAllUsers = () => {
    setSelectedUsers([]);
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

  // Get username and mechanographic number for display
  const getUserDisplayName = (email: string): string => {
    // First try to find user in allUsers (from users table)
    const user = allUsers.find(u => u.email === email);
    if (user) {
      return `${user.name} - ${user.mechanographic_number}`;
    }
    
    // Fallback to schedule data
    const userSchedule = schedules.find(schedule => schedule.email === email);
    if (userSchedule && userSchedule.user) {
      return userSchedule.user;
    }
    
    return email;
  };

  // Get username for display (without mechanographic number)
  const getUserNameFromEmail = (email: string): string => {
    // First try to find user in allUsers (from users table)
    const user = allUsers.find(u => u.email === email);
    if (user) {
      return user.name;
    }
    
    // Fallback to schedule data
    const userSchedule = schedules.find(schedule => schedule.email === email);
    if (userSchedule && userSchedule.user) {
      return userSchedule.user;
    }
    
    return email;
  };

  const handleExportPDF = async () => {
    await exportSchedulesToPDF(selectedUsers, schedules, toast);
  };

  const handleDeleteSelected = async () => {
    try {
      for (const email of selectedUsers) {
        await scheduleService.deleteUserSchedule(email);
      }
      
      // Update UI state
      setSchedules(prev => prev.filter(schedule => !selectedUsers.includes(schedule.email)));
      setUserEmails(prev => prev.filter(e => !selectedUsers.includes(e)));
      setSelectedUsers([]);
      
      toast({
        title: "Escalas eliminadas",
        description: `${selectedUsers.length} escala(s) foi(ram) eliminada(s) com sucesso.`,
      });
    } catch (error) {
      console.error("Error deleting selected schedules:", error);
      toast({
        title: "Erro ao eliminar",
        description: "Ocorreu um erro ao eliminar as escalas selecionadas.",
        variant: "destructive",
      });
    }
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
          isMigrating={false}
          migrationDone={false}
          onExportPDF={handleExportPDF}
          onMigrateData={() => {}} // Removed migration functionality
          onRefresh={loadAllSchedules}
          onDeleteSelected={handleDeleteSelected}
          onSelectAll={selectAllUsers}
          onDeselectAll={deselectAllUsers}
        />
      )}
      
      <MigrationStatus 
        migrationDone={false}
        migrationCount={0}
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
          getUserNameFromEmail={getUserDisplayName}
        />
      )}
    </div>
  );
};

export default UserSchedules;
