
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { systemSettingsService } from "@/services/supabase/systemSettingsService";
import WeekdayCheckboxCalendar from './WeekdayCheckboxCalendar';
import ScheduleSummary from './ScheduleSummary';
import { useScheduleSubmission } from '@/hooks/useScheduleSubmission';
import { addMonths, format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScheduleCalendarProps {
  userEmail?: string;
  isAdmin?: boolean;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ userEmail: propUserEmail, isAdmin = false }) => {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedOvernights, setSelectedOvernights] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [overnightNotes, setOvernightNotes] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [editCount, setEditCount] = useState(0);
  const [canSubmitAfter15th, setCanSubmitAfter15th] = useState(false);
  const [showSingleShiftWarning, setShowSingleShiftWarning] = useState(false);
  const nextMonth = addMonths(new Date(), 1);
  const { toast } = useToast();

  const { submitSchedule, isLoading } = useScheduleSubmission({
    userEmail: propUserEmail,
    userInfo,
    nextMonth,
    onSuccess: () => {
      console.log('=== SCHEDULE SUBMISSION SUCCESS ===');
      console.log('Resetting form and incrementing edit count');
      setEditCount(prev => prev + 1);
      setSelectedDates([]);
      setSelectedOvernights([]);
      setNotes('');
      setOvernightNotes('');
    }
  });

  useEffect(() => {
    console.log('=== SCHEDULE CALENDAR INITIALIZATION ===');
    const storedUser = localStorage.getItem('mysqlConnection');
    if (storedUser) {
      const parsedUserInfo = JSON.parse(storedUser);
      console.log('User info loaded:', parsedUserInfo);
      setUserInfo(parsedUserInfo);
      checkSubmissionPermission(parsedUserInfo?.email || propUserEmail);
    }
  }, [propUserEmail]);

  const checkSubmissionPermission = async (userEmail: string) => {
    if (!userEmail) return;
    
    try {
      const permission = await systemSettingsService.getSystemSetting(`allow_submission_after_15th_${userEmail}`);
      setCanSubmitAfter15th(permission === 'true');
    } catch (error) {
      console.error('Error checking submission permission:', error);
    }
  };

  const isSubmissionAllowed = (): boolean => {
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentHour = currentDate.getHours();
    const currentMinute = currentDate.getMinutes();
    
    if (currentDay > 15 || (currentDay === 15 && currentHour === 23 && currentMinute >= 59)) {
      return canSubmitAfter15th;
    }
    
    return true;
  };

  const getSubmissionMessage = (): string => {
    if (!isSubmissionAllowed()) {
      return "A escala apenas pode ser inserida até dia 15 às 23:59";
    }
    return "";
  };

  const handleSubmitSchedule = async () => {
    console.log('=== SUBMIT BUTTON CLICKED ===');
    console.log('Current state:');
    console.log('- Selected Dates:', selectedDates);
    console.log('- Selected Overnights:', selectedOvernights);
    console.log('- Notes:', notes);
    console.log('- Overnight Notes:', overnightNotes);
    console.log('- User Info:', userInfo);
    console.log('- Edit Count:', editCount);

    if (selectedDates.length === 0 && selectedOvernights.length === 0) {
      console.log('No selections made, showing error');
      toast({
        title: "Nenhuma seleção feita",
        description: "Por favor, selecione pelo menos um turno ou pernoita antes de submeter.",
        variant: "destructive",
      });
      return;
    }

    const totalSelections = selectedDates.length + selectedOvernights.length;
    console.log('Total selections:', totalSelections);

    if (totalSelections === 1) {
      console.log('Only one selection, showing warning');
      setShowSingleShiftWarning(true);
      return;
    }

    await proceedWithSubmission();
  };

  const proceedWithSubmission = async () => {
    console.log('=== PROCEEDING WITH SUBMISSION ===');
    
    if (!isSubmissionAllowed()) {
      console.log('Submission not allowed due to date restrictions');
      toast({
        title: "Submissão não permitida",
        description: getSubmissionMessage(),
        variant: "destructive",
      });
      return;
    }

    console.log('Calling submitSchedule function...');
    const success = await submitSchedule(selectedDates, selectedOvernights, notes, overnightNotes);
    
    if (success) {
      console.log('Submission successful, closing warning dialog');
      setShowSingleShiftWarning(false);
    } else {
      console.log('Submission failed');
    }
  };

  const canSubmitSchedule = editCount < 2;
  const submissionBlocked = !isSubmissionAllowed();

  console.log('Current render state:', {
    selectedDates,
    selectedOvernights,
    editCount,
    canSubmitSchedule,
    submissionBlocked,
    isLoading
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Calendar className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Inserir Escala
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Selecione os seus turnos para {format(nextMonth, 'MMMM yyyy', { locale: pt })}
          </p>
        </div>

        {submissionBlocked && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div className="text-red-800">
                <p className="font-medium">{getSubmissionMessage()}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <WeekdayCheckboxCalendar
              selectedDates={selectedDates}
              onDateSelect={setSelectedDates}
              selectedOvernights={selectedOvernights}
              onOvernightSelect={setSelectedOvernights}
              nextMonth={nextMonth}
              disabled={isLoading || submissionBlocked}
              editCount={editCount}
              notes={notes}
              onNotesChange={setNotes}
              overnightNotes={overnightNotes}
              onOvernightNotesChange={setOvernightNotes}
            />
          </div>

          <div className="xl:col-span-1 space-y-6">
            <ScheduleSummary
              selectedDates={selectedDates}
              selectedOvernights={selectedOvernights}
              editCount={editCount}
              canSubmitSchedule={canSubmitSchedule}
              submissionBlocked={submissionBlocked}
              isLoading={isLoading}
              onSubmit={handleSubmitSchedule}
            />
          </div>
        </div>

        <AlertDialog open={showSingleShiftWarning} onOpenChange={setShowSingleShiftWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apenas escolheu uma opção</AlertDialogTitle>
              <AlertDialogDescription>
                Aconselhamos a colocar mais uma escolha pelo menos para aumentar as suas hipóteses de ser escalado.
                Tem a certeza que só quer escolher uma opção?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={proceedWithSubmission}>
                Sim, continuar assim mesmo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default ScheduleCalendar;
