import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { scheduleService } from "@/services/supabase/scheduleService";
import { systemSettingsService } from "@/services/supabase/systemSettingsService";
import WeekdayCheckboxCalendar from './WeekdayCheckboxCalendar';
import { addMonths, format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar, Save, Clock, AlertTriangle } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [editCount, setEditCount] = useState(0);
  const [canSubmitAfter15th, setCanSubmitAfter15th] = useState(false);
  const [showSingleShiftWarning, setShowSingleShiftWarning] = useState(false);
  const nextMonth = addMonths(new Date(), 1);

  useEffect(() => {
    // Get user info from localStorage if not provided via props
    const storedUser = localStorage.getItem('mysqlConnection');
    if (storedUser) {
      const parsedUserInfo = JSON.parse(storedUser);
      setUserInfo(parsedUserInfo);
      
      // Check if user can submit after 15th
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
    
    // If it's after the 15th at 23:59
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

  const handleDateSelect = (dates: string[]) => {
    setSelectedDates(dates);
  };

  const handleOvernightSelect = (overnights: string[]) => {
    setSelectedOvernights(overnights);
  };

  const proceedWithSubmission = async () => {
    const currentUserInfo = userInfo;
    const currentUserEmail = propUserEmail || currentUserInfo?.email;

    if (!currentUserInfo && !propUserEmail) {
      toast({
        title: "Erro de autenticação",
        description: "Informações do utilizador não encontradas.",
        variant: "destructive",
      });
      return;
    }

    if (!isSubmissionAllowed()) {
      toast({
        title: "Submissão não permitida",
        description: getSubmissionMessage(),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const scheduleData = {
        month: format(nextMonth, 'yyyy-MM'),
        dates: selectedDates,
        overnights: selectedOvernights
      };

      const combinedNotes = [
        notes && `Turnos: ${notes}`,
        overnightNotes && `Pernoitas: ${overnightNotes}`
      ].filter(Boolean).join('\n\n');

      console.log('Saving schedule with data:', {
        email: currentUserEmail,
        scheduleData,
        notes: combinedNotes,
        userData: { name: currentUserInfo?.name || 'User' }
      });

      const result = await scheduleService.saveUserScheduleWithNotes(
        currentUserEmail,
        scheduleData,
        combinedNotes,
        { name: currentUserInfo?.name || 'User' }
      );

      if (result.success) {
        setEditCount(prev => prev + 1);
        toast({
          title: "Escala submetida",
          description: "A sua escala foi submetida com sucesso!",
        });
        
        // Clear form
        setSelectedDates([]);
        setSelectedOvernights([]);
        setNotes('');
        setOvernightNotes('');
      } else {
        throw new Error("Failed to save schedule");
      }
    } catch (error) {
      console.error("Error submitting schedule:", error);
      toast({
        title: "Erro ao submeter",
        description: "Ocorreu um erro ao submeter a sua escala. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowSingleShiftWarning(false);
    }
  };

  const handleSubmitSchedule = async () => {
    if (selectedDates.length === 0 && selectedOvernights.length === 0) {
      toast({
        title: "Nenhuma seleção feita",
        description: "Por favor, selecione pelo menos um turno ou pernoita antes de submeter.",
        variant: "destructive",
      });
      return;
    }

    // Check if user selected only one shift and show warning
    const totalSelections = selectedDates.length + selectedOvernights.length;
    if (totalSelections === 1) {
      setShowSingleShiftWarning(true);
      return;
    }

    // Proceed with submission
    await proceedWithSubmission();
  };

  const { toast } = useToast();

  const canSubmitSchedule = editCount < 2;
  const totalSelectedShifts = selectedDates.length;
  const submissionBlocked = !isSubmissionAllowed();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
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

        {/* Submission Warning */}
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
          {/* Calendar Section - Takes most space */}
          <div className="xl:col-span-2">
            <WeekdayCheckboxCalendar
              selectedDates={selectedDates}
              onDateSelect={handleDateSelect}
              selectedOvernights={selectedOvernights}
              onOvernightSelect={handleOvernightSelect}
              nextMonth={nextMonth}
              disabled={isLoading || submissionBlocked}
              editCount={editCount}
              notes={notes}
              onNotesChange={setNotes}
              overnightNotes={overnightNotes}
              onOvernightNotesChange={setOvernightNotes}
            />
          </div>

          {/* Sidebar with Summary and Actions */}
          <div className="xl:col-span-1 space-y-6">
            {/* Summary Card */}
            <Card className="bg-white border-gray-200 shadow-lg">
              <CardContent className="pt-6 space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Resumo
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <p className="text-sm text-blue-600 font-medium">Turnos</p>
                    <p className="text-2xl font-bold text-blue-900">{totalSelectedShifts}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <p className="text-sm text-purple-600 font-medium">Pernoitas</p>
                    <p className="text-2xl font-bold text-purple-900">{selectedOvernights.length}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-600 font-medium">Submissões</p>
                  <p className="text-2xl font-bold text-gray-900">{editCount} / 2</p>
                </div>
                
                {!canSubmitSchedule && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                    <p className="text-red-700 text-sm font-medium text-center">
                      ⚠️ Limite de submissões atingido
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleSubmitSchedule}
                  disabled={isLoading || (selectedDates.length === 0 && selectedOvernights.length === 0) || !canSubmitSchedule || submissionBlocked}
                  className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      A submeter...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="h-5 w-5" />
                      Guardar Escala
                    </div>
                  )}
                </Button>
                
                {(selectedDates.length === 0 && selectedOvernights.length === 0) && (
                  <p className="text-sm text-gray-500 text-center mt-2">
                    Selecione pelo menos um turno ou pernoita para submeter
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Single Shift Warning Dialog */}
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
