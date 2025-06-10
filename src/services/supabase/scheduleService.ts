
import { supabase } from "./client";

export const scheduleService = {
  // Save schedule with completely new approach
  async saveSchedule(
    userEmail: string, 
    userName: string, 
    month: string,
    scheduleData: { shifts: string[]; overnights: string[] }, 
    notes: string
  ): Promise<{ success: boolean; error?: string }> {
    console.log('=== SAVING SCHEDULE TO DATABASE ===');
    console.log('Parameters:', { userEmail, userName, month, scheduleData, notes });
    
    try {
      // Check if record already exists
      const { data: existingRecord, error: selectError } = await supabase
        .from('schedules')
        .select('id, edit_count')
        .eq('user_email', userEmail)
        .eq('month', month)
        .maybeSingle();
      
      if (selectError) {
        console.error('Error checking existing record:', selectError);
        return { success: false, error: selectError.message };
      }

      console.log('Existing record:', existingRecord);

      if (existingRecord) {
        // Update existing record
        console.log('Updating existing record with ID:', existingRecord.id);
        
        const { data, error } = await supabase
          .from('schedules')
          .update({
            user_name: userName,
            dates: scheduleData,
            notes: notes || null,
            edit_count: (existingRecord.edit_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id)
          .select();
          
        if (error) {
          console.error('Error updating schedule:', error);
          return { success: false, error: error.message };
        }
        
        console.log('Successfully updated schedule:', data);
      } else {
        // Create new record
        console.log('Creating new schedule record');
        
        const { data, error } = await supabase
          .from('schedules')
          .insert({
            user_email: userEmail,
            user_name: userName,
            month: month,
            dates: scheduleData,
            notes: notes || null,
            edit_count: 1
          })
          .select();
          
        if (error) {
          console.error('Error inserting schedule:', error);
          return { success: false, error: error.message };
        }
        
        console.log('Successfully inserted new schedule:', data);
      }
      
      // Verify the data was saved by fetching it back
      const { data: verifyData, error: verifyError } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_email', userEmail)
        .eq('month', month)
        .maybeSingle();
        
      if (verifyError) {
        console.error('Error verifying saved data:', verifyError);
        return { success: false, error: verifyError.message };
      }
      
      console.log('=== VERIFICATION: DATA SAVED SUCCESSFULLY ===');
      console.log('Verified saved data:', verifyData);
      
      return { success: true };
    } catch (error) {
      console.error('=== ERROR SAVING SCHEDULE ===', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Get user schedules
  async getUserSchedules(): Promise<any[]> {
    console.log('Getting all user schedules from Supabase');
    
    try {
      const { data: supabaseSchedules, error } = await supabase
        .from('schedules')
        .select('*')
        .order('updated_at', { ascending: false });
        
      if (error) {
        console.error('Error getting schedules from Supabase:', error);
        throw error;
      }
      
      if (supabaseSchedules && supabaseSchedules.length > 0) {
        console.log(`Retrieved ${supabaseSchedules.length} schedules from Supabase`);
        return supabaseSchedules.map(schedule => ({
          email: schedule.user_email,
          user: schedule.user_name,
          month: schedule.month,
          dates: schedule.dates,
          notes: schedule.notes,
          editCount: schedule.edit_count
        }));
      }
      
      console.log('No schedules found in Supabase');
      return [];
    } catch (error) {
      console.error('Error getting schedules:', error);
      return [];
    }
  },
  
  // Delete user schedule
  async deleteUserSchedule(userEmail: string): Promise<{ success: boolean }> {
    console.log('Deleting schedule for user', userEmail);
    
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('user_email', userEmail);
        
      if (error) {
        console.error('Error deleting schedule from Supabase:', error);
        throw error;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting schedule:', error);
      return { success: false };
    }
  },
  
  // Reset user edit counter
  async resetEditCounter(userEmail: string): Promise<{ success: boolean }> {
    console.log('Resetting edit counter for user', userEmail);
    
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ edit_count: 0 })
        .eq('user_email', userEmail);
        
      if (error) {
        console.error('Error resetting edit counter in Supabase:', error);
        throw error;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error resetting edit counter:', error);
      return { success: false };
    }
  },
  
  // Set up real-time subscription for schedule changes
  setupRealtimeSubscription(callback: () => void) {
    console.log('Setting up realtime subscription for schedules');
    const channel = supabase
      .channel('schedules-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'schedules' 
        }, 
        (payload) => {
          console.log('Realtime schedule change detected:', payload);
          callback();
        })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
