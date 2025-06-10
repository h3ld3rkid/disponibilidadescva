
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import WeekdayCheckboxCalendar from './WeekdayCheckboxCalendar';
import ScheduleSummary from './ScheduleSummary';
import { scheduleService } from "@/services/supabase/scheduleService";

interface ScheduleCalendarProps {
  userEmail?: string;
  isAdmin?: boolean;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ userEmail, isAdmin = false }) => {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedOvernights, setSelectedOvernights] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [editCount, setEditCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasExistingSchedule, setHasExistingSchedule] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    console.log('=== SCHEDULE CALENDAR INITIALIZATION ===');
    const storedUser = localStorage.getItem('mysqlConnection');
    if (storedUser) {
      const parsedUserInfo = JSON.parse(storedUser);
      console.log('User info loaded:', parsedUserInfo);
      setUserInfo(parsedUserInfo);
      
      // Load existing schedule if available
      loadExistingSchedule(parsedUserInfo.email);
    }
  }, [userEmail]);

  const loadExistingSchedule = async (email: string) => {
    try {
      console.log('Loading existing schedule for:', email);
      const schedules = await scheduleService.getUserSchedules();
      const userSchedule = schedules.find(s => s.email === email);
      
      if (userSchedule && userSchedule.dates) {
        console.log('Found existing schedule:', userSchedule);
        setSelectedDates(userSchedule.dates.shifts || []);
        setSelectedOvernights(userSchedule.dates.overnights || []);
        setNotes(userSchedule.notes || '');
        setEditCount(userSchedule.editCount || 0);
        setHasExistingSchedule(true);
      }
    } catch (error) {
      console.error('Error loading existing schedule:', error);
    }
  };

  const handleDateToggle = (date: string) => {
    console.log('Date toggled:', date);
    setSelectedDates(prev => {
      const newDates = prev.includes(date) 
        ? prev.filter(d => d !== date)
        : [...prev, date];
      console.log('New selected dates:', newDates);
      return newDates;
    });
  };

  const handleOvernightToggle = (overnight: string) => {
    console.log('Overnight toggled:', overnight);
    setSelectedOvernights(prev => {
      const newOvernights = prev.includes(overnight) 
        ? prev.filter(o => o !== overnight)
        : [...prev, overnight];
      console.log('New selected overnights:', newOvernights);
      return newOvernights;
    });
  };

  const handleNotesChange = (newNotes: string) => {
    console.log('Notes changed:', newNotes);
    setNotes(newNotes);
  };

  const handleSubmit = async () => {
    const currentUserEmail = userEmail || userInfo?.email;
    
    if (!currentUserEmail) {
      toast({
        title: "Erro",
        description: "Email do utilizador não encontrado.",
        variant: "destructive",
      });
      return;
    }

    if (selectedDates.length === 0 && selectedOvernights.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um turno ou pernoite.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('=== SUBMITTING SCHEDULE ===');
      console.log('User Email:', currentUserEmail);
      console.log('Selected Dates:', selectedDates);
      console.log('Selected Overnights:', selectedOvernights);
      console.log('Notes:', notes);
      
      const scheduleData = {
        shifts: selectedDates,
        overnights: selectedOvernights
      };
      
      const result = await scheduleService.saveSchedule(
        currentUserEmail,
        userInfo?.name || currentUserEmail,
        scheduleData,
        notes
      );
      
      if (result.success) {
        toast({
          title: "Sucesso",
          description: "Escala submetida com sucesso!",
        });
        
        setEditCount(prev => prev + 1);
        setHasExistingSchedule(true);
      } else {
        throw new Error('Failed to save schedule');
      }
      
    } catch (error) {
      console.error('Error submitting schedule:', error);
      toast({
        title: "Erro",
        description: "Erro ao submeter a escala. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmitSchedule = selectedDates.length > 0 || selectedOvernights.length > 0;
  const submissionBlocked = editCount >= 2;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        <div className="lg:col-span-2">
          <WeekdayCheckboxCalendar 
            selectedDates={selectedDates}
            selectedOvernights={selectedOvernights}
            notes={notes}
            onDateToggle={handleDateToggle}
            onOvernightToggle={handleOvernightToggle}
            onNotesChange={handleNotesChange}
            isAdmin={isAdmin}
            userEmail={userEmail || userInfo?.email}
          />
        </div>
        
        <div className="lg:col-span-1">
          <ScheduleSummary 
            selectedDates={selectedDates}
            selectedOvernights={selectedOvernights}
            editCount={editCount}
            canSubmitSchedule={canSubmitSchedule}
            submissionBlocked={submissionBlocked}
            isLoading={isLoading}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
};

export default ScheduleCalendar;
