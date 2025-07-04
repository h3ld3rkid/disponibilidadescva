
import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import ScheduleSummary from './ScheduleSummary';
import SingleShiftWarning from './SingleShiftWarning';
import SubmissionDeadlineAlert from './SubmissionDeadlineAlert';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Moon } from 'lucide-react';
import { scheduleService } from "@/services/supabase/scheduleService";
import { systemSettingsService } from "@/services/supabase/systemSettingsService";

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
  const [hasSpecialPermission, setHasSpecialPermission] = useState(false);
  const { toast } = useToast();

  console.log('=== SCHEDULE CALENDAR RENDER ===');
  console.log('selectedDates:', selectedDates);
  console.log('selectedOvernights:', selectedOvernights);

  const weekdayShifts = [
    'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'
  ];

  const saturdayShifts = [
    'Sábado_manhã', 'Sábado_tarde', 'Sábado_noite'
  ];

  const sundayShifts = [
    'Domingo_manhã', 'Domingo_noite'
  ];

  const overnights = [
    'Dom/Seg', 'Seg/Ter', 'Ter/Qua', 'Qua/Qui', 'Qui/Sex', 'Sex/Sab', 'Sab/Dom'
  ];

  // Calculate the target month (next month)
  const getTargetMonth = () => {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + 1);
    return targetMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  };

  // Check if submission is allowed
  const isSubmissionAllowed = () => {
    const today = new Date();
    const currentDay = today.getDate();
    
    // Allow submission if before or on 15th, or if user has special permission
    return currentDay <= 15 || hasSpecialPermission;
  };

  const checkSpecialPermissions = useCallback(async (email: string) => {
    try {
      const permission = await systemSettingsService.getSystemSetting(`allow_submission_after_15th_${email}`);
      setHasSpecialPermission(permission === 'true');
    } catch (error) {
      console.error('Error checking special permissions:', error);
      setHasSpecialPermission(false);
    }
  }, []);

  const loadExistingSchedule = useCallback(async (email: string) => {
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
  }, []);

  useEffect(() => {
    console.log('=== SCHEDULE CALENDAR INITIALIZATION ===');
    console.log('userEmail prop:', userEmail);
    console.log('isAdmin prop:', isAdmin);
    
    const storedUser = localStorage.getItem('mysqlConnection');
    if (storedUser) {
      const parsedUserInfo = JSON.parse(storedUser);
      console.log('User info loaded:', parsedUserInfo);
      setUserInfo(parsedUserInfo);
      
      // Load existing schedule if available - use the correct email
      const currentUserEmail = userEmail || parsedUserInfo.email;
      console.log('Loading schedule for email:', currentUserEmail);
      
      if (currentUserEmail) {
        loadExistingSchedule(currentUserEmail);
        checkSpecialPermissions(currentUserEmail);
      }
    }
  }, [userEmail, loadExistingSchedule, checkSpecialPermissions]);

  const handleShiftToggle = (shift: string) => {
    console.log('Shift toggle for:', shift);
    setSelectedDates(prev => {
      const newShifts = prev.includes(shift)
        ? prev.filter(s => s !== shift)
        : [...prev, shift];
      console.log('New shifts array:', newShifts);
      return newShifts;
    });
  };

  const handleOvernightToggle = (overnight: string) => {
    console.log('Overnight toggle for:', overnight);
    setSelectedOvernights(prev => {
      const newOvernights = prev.includes(overnight)
        ? prev.filter(o => o !== overnight)
        : [...prev, overnight];
      console.log('New overnights array:', newOvernights);
      return newOvernights;
    });
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

    // Check if submission is allowed
    if (!isSubmissionAllowed()) {
      toast({
        title: "Submissão não permitida",
        description: "Já não pode submeter a escala após o dia 15 do mês.",
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
        throw new Error(result.message || 'Failed to save schedule');
      }
      
    } catch (error) {
      console.error('Error submitting schedule:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao submeter a escala. Tente novamente.",
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

  const canSubmitSchedule = (selectedDates.length > 0 || selectedOvernights.length > 0) && isSubmissionAllowed();
  const submissionBlocked = editCount >= 2 || !isSubmissionAllowed();

  const ShiftButton = ({ shift, isSelected, onClick, color = "blue" }: {
    shift: string;
    isSelected: boolean;
    onClick: () => void;
    color?: string;
  }) => {
    const getColorClasses = () => {
      if (isSelected) {
        switch (color) {
          case "blue":
            return "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30";
          case "orange":
            return "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-500/30";
          case "purple":
            return "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/30";
          default:
            return "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30";
        }
      } else {
        switch (color) {
          case "blue":
            return "bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50";
          case "orange":
            return "bg-white border-gray-300 text-gray-700 hover:border-orange-400 hover:bg-orange-50";
          case "purple":
            return "bg-white border-gray-300 text-gray-700 hover:border-purple-400 hover:bg-purple-50";
          default:
            return "bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50";
        }
      }
    };

    return (
      <button
        type="button"
        onClick={onClick}
        className={`
          flex items-center justify-center p-4 rounded-xl cursor-pointer transition-all duration-300 ease-in-out
          border-2 font-semibold text-sm min-h-[60px] w-full relative
          ${getColorClasses()}
          transform hover:scale-105 active:scale-95
        `}
      >
        <span className="text-center font-medium">
          {shift.replace('_', ' ')}
        </span>
        {isSelected && (
          <div className="absolute top-2 right-2">
            <div className="w-3 h-3 bg-white rounded-full opacity-90 animate-pulse"></div>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!isAdmin && (
        <div className="p-6 pb-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Escala mês de {getTargetMonth()}
          </h1>
          <p className="text-gray-600 mb-4">
            Selecione os seus turnos para o próximo mês
          </p>
          <SubmissionDeadlineAlert userEmail={userEmail || userInfo?.email} />
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Shifts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Turnos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Weekday Shifts */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-6">Dias da Semana</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {weekdayShifts.map(shift => (
                    <ShiftButton
                      key={shift}
                      shift={shift}
                      isSelected={selectedDates.includes(shift)}
                      onClick={() => handleShiftToggle(shift)}
                      color="blue"
                    />
                  ))}
                </div>
              </div>

              {/* Weekend Shifts */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-6">Fim de Semana</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Saturday */}
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
                    <h4 className="text-lg font-semibold text-orange-800 mb-4 text-center">Sábado</h4>
                    <div className="space-y-3">
                      {saturdayShifts.map(shift => (
                        <ShiftButton
                          key={shift}
                          shift={shift.replace('Sábado_', '')}
                          isSelected={selectedDates.includes(shift)}
                          onClick={() => handleShiftToggle(shift)}
                          color="orange"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Sunday */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                    <h4 className="text-lg font-semibold text-purple-800 mb-4 text-center">Domingo</h4>
                    <div className="space-y-3">
                      {sundayShifts.map(shift => (
                        <ShiftButton
                          key={shift}
                          shift={shift.replace('Domingo_', '')}
                          isSelected={selectedDates.includes(shift)}
                          onClick={() => handleShiftToggle(shift)}
                          color="purple"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overnights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5 text-purple-600" />
                Pernoites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {overnights.map(overnight => (
                  <ShiftButton
                    key={overnight}
                    shift={overnight}
                    isSelected={selectedOvernights.includes(overnight)}
                    onClick={() => handleOvernightToggle(overnight)}
                    color="purple"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Shift Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Observações - Turnos</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Adicione observações sobre a sua disponibilidade para turnos..."
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                className="min-h-[120px] resize-none border-2 focus:border-blue-500 transition-colors"
              />
            </CardContent>
          </Card>

          {/* Overnight Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Observações - Pernoites</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Adicione observações sobre a sua disponibilidade para pernoites..."
                value={overnightNotes}
                onChange={(e) => setOvernightNotes(e.target.value)}
                className="min-h-[120px] resize-none border-2 focus:border-purple-500 transition-colors"
              />
            </CardContent>
          </Card>
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
