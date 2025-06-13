
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import WeekdayCheckboxCalendar from './WeekdayCheckboxCalendar';
import ScheduleSummary from './ScheduleSummary';
import SingleShiftWarning from './SingleShiftWarning';
import { scheduleService } from "@/services/supabase/scheduleService";

interface ScheduleCalendarProps {
  userEmail?: string;
  isAdmin?: boolean;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ userEmail, isAdmin = false }) => {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedOvernights, setSelectedOvernights] = useState<string[]>([]);
  const [shiftNotes, setShiftNotes] = useState('');
  const [overnightNotes, setOvernightNotes] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [editCount, setEditCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasExistingSchedule, setHasExistingSchedule] = useState(false);
  const [showSingleShiftWarning, setShowSingleShiftWarning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    console.log('=== SCHEDULE CALENDAR INITIALIZATION ===');
    const storedUser = localStorage.getItem('mysqlConnection');
    if (storedUser) {
      const parsedUserInfo = JSON.parse(storedUser);
      console.log('User info loaded:', parsedUserInfo);
      setUserInfo(parsedUserInfo);
      
      // Load existing schedule if available - use the correct email
      const currentUserEmail = userEmail || parsedUserInfo.email;
      console.log('Loading schedule for email:', currentUserEmail);
      loadExistingSchedule(currentUserEmail);
    }
  }, [userEmail]);

  const loadExistingSchedule = async (email: string) => {
    try {
      console.log('Loading existing schedule for email:', email);
      const schedules = await scheduleService.getUserSchedules();
      console.log('All schedules loaded:', schedules);
      
      const userSchedule = schedules.find(s => s.email === email);
      console.log('Found user schedule:', userSchedule);
      
      if (userSchedule && userSchedule.dates) {
        console.log('Setting existing schedule data:', userSchedule);
        setSelectedDates(userSchedule.dates.shifts || []);
        setSelectedOvernights(userSchedule.dates.overnights || []);
        setShiftNotes(userSchedule.dates.shiftNotes || '');
        setOvernightNotes(userSchedule.dates.overnightNotes || '');
        setEditCount(userSchedule.editCount || 0);
        setHasExistingSchedule(true);
      } else {
        console.log('No existing schedule found for user:', email);
        // Reset to empty state
        setSelectedDates([]);
        setSelectedOvernights([]);
        setShiftNotes('');
        setOvernightNotes('');
        setEditCount(0);
        setHasExistingSchedule(false);
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

  const handleShiftNotesChange = (newNotes: string) => {
    console.log('Shift notes changed:', newNotes);
    setShiftNotes(newNotes);
  };

  const handleOvernightNotesChange = (newNotes: string) => {
    console.log('Overnight notes changed:', newNotes);
    setOvernightNotes(newNotes);
  };

  const checkForSingleShift = () => {
    const totalShifts = selectedDates.length + selectedOvernights.length;
    return totalShifts === 1;
  };

  const handleSubmit = async () => {
    const currentUserEmail = userEmail || userInfo?.email;
    
    console.log('=== SUBMITTING SCHEDULE ===');
    console.log('Current user email from userEmail prop:', userEmail);
    console.log('Current user email from userInfo:', userInfo?.email);
    console.log('Final current user email:', currentUserEmail);
    
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

    // Check if only one shift is selected and show warning
    if (checkForSingleShift()) {
      setShowSingleShiftWarning(true);
      return;
    }

    await submitSchedule(currentUserEmail);
  };

  const submitSchedule = async (currentUserEmail: string) => {
    setIsLoading(true);
    
    try {
      console.log('Submitting schedule for user:', currentUserEmail);
      console.log('Selected Dates:', selectedDates);
      console.log('Selected Overnights:', selectedOvernights);
      console.log('Shift Notes:', shiftNotes);
      console.log('Overnight Notes:', overnightNotes);
      
      const scheduleData = {
        shifts: selectedDates,
        overnights: selectedOvernights,
        shiftNotes: shiftNotes,
        overnightNotes: overnightNotes
      };
      
      const result = await scheduleService.saveSchedule(
        currentUserEmail,
        userInfo?.name || currentUserEmail,
        scheduleData
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

  const handleWarningContinue = () => {
    setShowSingleShiftWarning(false);
    const currentUserEmail = userEmail || userInfo?.email;
    if (currentUserEmail) {
      submitSchedule(currentUserEmail);
    }
  };

  const handleWarningClose = () => {
    setShowSingleShiftWarning(false);
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
            shiftNotes={shiftNotes}
            overnightNotes={overnightNotes}
            onDateToggle={handleDateToggle}
            onOvernightToggle={handleOvernightToggle}
            onShiftNotesChange={handleShiftNotesChange}
            onOvernightNotesChange={handleOvernightNotesChange}
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

      <SingleShiftWarning 
        isOpen={showSingleShiftWarning}
        onClose={handleWarningClose}
        onContinue={handleWarningContinue}
      />
    </div>
  );
};

export default ScheduleCalendar;
