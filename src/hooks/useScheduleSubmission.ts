
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
      console.log('User Name:', userInfo?.name);
      console.log('Selected Dates (shifts):', selectedDates);
      console.log('Selected Overnights:', selectedOvernights);
      console.log('Notes:', notes);
      console.log('Overnight Notes:', overnightNotes);

      const month = format(nextMonth, 'yyyy-MM');
      console.log('Month:', month);

      // Combine all notes
      const allNotes = [
        notes && `Turnos: ${notes}`,
        overnightNotes && `Pernoitas: ${overnightNotes}`
      ].filter(Boolean).join('\n\n');

      console.log('Combined notes:', allNotes);

      // Create schedule data structure
      const scheduleData = {
        shifts: selectedDates,
        overnights: selectedOvernights
      };

      console.log('Schedule data to save:', scheduleData);

      // Save to database
      const result = await scheduleService.saveSchedule(
        currentUserEmail,
        userInfo?.name || currentUserEmail,
        month,
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
        throw new Error(result.error || "Failed to save schedule");
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
