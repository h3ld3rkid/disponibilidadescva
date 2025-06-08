
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
      // Prepare all selected items with clear identification
      const allDates = [...selectedDates];
      const allOvernights = [...selectedOvernights];
      
      // Combine notes
      const combinedNotes = [
        notes && `Turnos: ${notes}`,
        overnightNotes && `Pernoitas: ${overnightNotes}`
      ].filter(Boolean).join('\n\n');

      console.log('Submitting schedule:', {
        email: currentUserEmail,
        month: format(nextMonth, 'yyyy-MM'),
        selectedDates: allDates,
        selectedOvernights: allOvernights,
        notes: combinedNotes
      });

      // Save to Supabase with proper structure
      const result = await scheduleService.saveUserScheduleWithNotes(
        currentUserEmail,
        {
          month: format(nextMonth, 'yyyy-MM'),
          dates: allDates,
          overnights: allOvernights
        },
        combinedNotes,
        { name: userInfo?.name || 'User' }
      );

      if (result.success) {
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
      console.error("Error submitting schedule:", error);
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
