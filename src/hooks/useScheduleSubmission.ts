
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
      console.log('=== SCHEDULE SUBMISSION START ===');
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

      // Create the schedule data exactly as expected by database
      const scheduleData = {
        shifts: selectedDates,
        overnights: selectedOvernights
      };

      console.log('Final schedule data:', JSON.stringify(scheduleData, null, 2));

      // Check if record already exists
      console.log('Checking for existing record...');
      const { data: existingRecord, error: selectError } = await supabase
        .from('schedules')
        .select('id, edit_count')
        .eq('user_email', currentUserEmail)
        .eq('month', month)
        .maybeSingle();
      
      if (selectError) {
        console.error('Error checking existing record:', selectError);
        throw new Error(selectError.message);
      }

      console.log('Existing record found:', existingRecord);

      let result;

      if (existingRecord) {
        // Update existing record
        console.log('Updating existing record with ID:', existingRecord.id);
        
        result = await supabase
          .from('schedules')
          .update({
            user_name: userInfo?.name || currentUserEmail,
            dates: scheduleData,
            notes: allNotes || null,
            edit_count: (existingRecord.edit_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id)
          .select('*');
          
        if (result.error) {
          console.error('Error updating schedule:', result.error);
          throw new Error(result.error.message);
        }
        
        console.log('Successfully updated schedule:', result.data);
      } else {
        // Create new record
        console.log('Creating new schedule record');
        
        result = await supabase
          .from('schedules')
          .insert({
            user_email: currentUserEmail,
            user_name: userInfo?.name || currentUserEmail,
            month: month,
            dates: scheduleData,
            notes: allNotes || null,
            edit_count: 1
          })
          .select('*');
          
        if (result.error) {
          console.error('Error inserting schedule:', result.error);
          throw new Error(result.error.message);
        }
        
        console.log('Successfully inserted new schedule:', result.data);
      }
      
      // Verify the data was saved by fetching it back
      console.log('Verifying saved data...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_email', currentUserEmail)
        .eq('month', month)
        .maybeSingle();
        
      if (verifyError) {
        console.error('Error verifying saved data:', verifyError);
        throw new Error('Failed to verify data was saved');
      }
      
      if (!verifyData) {
        console.error('No data found after save operation');
        throw new Error('Data was not saved properly');
      }
      
      console.log('=== VERIFICATION SUCCESS ===');
      console.log('Verified saved data:', JSON.stringify(verifyData, null, 2));
      
      toast({
        title: "Escala submetida",
        description: "A sua escala foi submetida com sucesso!",
      });
      
      onSuccess?.();
      return true;
      
    } catch (error) {
      console.error("=== ERROR SUBMITTING SCHEDULE ===", error);
      toast({
        title: "Erro ao submeter",
        description: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
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
