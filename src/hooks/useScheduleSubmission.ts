
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { scheduleService } from "@/services/supabase/scheduleService";
import { format } from 'date-fns';

interface UseScheduleSubmissionProps {
  userEmail?: string;
  userInfo?: any;
  nextMonth: Date;
  onSuccess?: () => void;
}

export const useScheduleSubmission = ({
  userEmail: propUserEmail,
  userInfo,
  nextMonth,
  onSuccess
}: UseScheduleSubmissionProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const submitSchedule = async (
    selectedDates: string[],
    selectedOvernights: string[],
    notes: string,
    overnightNotes: string
  ) => {
    const currentUserEmail = propUserEmail || userInfo?.email;

    if (!currentUserEmail) {
      toast({
        title: "Erro de autenticação",
        description: "Email do utilizador não encontrado.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);

    try {
      console.log('=== STARTING SCHEDULE SUBMISSION ===');
      console.log('User Email:', currentUserEmail);
      console.log('Selected Dates:', selectedDates);
      console.log('Selected Overnights:', selectedOvernights);
      console.log('Notes:', notes);
      console.log('Overnight Notes:', overnightNotes);

      // Prepare the schedule data with clear structure
      const scheduleData = {
        month: format(nextMonth, 'yyyy-MM'),
        shifts: selectedDates, // All selected shifts/weekdays
        overnights: selectedOvernights // All selected overnights
      };

      // Combine all notes
      const allNotes = [
        notes && `Turnos: ${notes}`,
        overnightNotes && `Pernoitas: ${overnightNotes}`
      ].filter(Boolean).join('\n\n');

      console.log('Final schedule data:', scheduleData);
      console.log('Final notes:', allNotes);

      // Submit to database
      const result = await scheduleService.saveSchedule(
        currentUserEmail,
        userInfo?.name || currentUserEmail,
        scheduleData,
        allNotes
      );

      if (result.success) {
        console.log('=== SCHEDULE SAVED SUCCESSFULLY ===');
        toast({
          title: "Escala submetida",
          description: "A sua escala foi submetida com sucesso!",
        });
        onSuccess?.();
        return true;
      } else {
        throw new Error("Failed to save schedule");
      }
    } catch (error) {
      console.error("=== ERROR SUBMITTING SCHEDULE ===", error);
      toast({
        title: "Erro ao submeter",
        description: "Ocorreu um erro ao submeter a sua escala. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    submitSchedule,
    isLoading
  };
};
