
import { supabase } from "./client";

export const scheduleService = {
  // Save user schedule
  async saveSchedule(userEmail: string, userName: string, scheduleData: any, notes: string): Promise<{ success: boolean }> {
    console.log('=== SAVING SCHEDULE TO SUPABASE ===');
    console.log('User Email:', userEmail);
    console.log('User Name:', userName);
    console.log('Schedule Data:', scheduleData);
    console.log('Notes:', notes);
    
    try {
      const month = new Date().getFullYear() + '-' + String(new Date().getMonth() + 2).padStart(2, '0'); // Next month
      console.log('Month:', month);
      
      // Check if schedule already exists
      const { data: existing, error: selectError } = await supabase
        .from('schedules')
        .select('id, edit_count')
        .eq('user_email', userEmail)
        .eq('month', month)
        .single();
        
      if (selectError && selectError.code !== 'PGRST116') {
        console.error('Error checking existing schedule:', selectError);
        throw selectError;
      }
      
      let result;
      
      if (existing) {
        // Update existing schedule
        console.log('Updating existing schedule with ID:', existing.id);
        result = await supabase
          .from('schedules')
          .update({
            user_name: userName,
            dates: scheduleData,
            notes: notes || null,
            edit_count: (existing.edit_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select();
      } else {
        // Create new schedule
        console.log('Creating new schedule');
        result = await supabase
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
      }
      
      if (result.error) {
        console.error('Error saving schedule:', result.error);
        throw result.error;
      }
      
      console.log('Schedule saved successfully:', result.data);
      return { success: true };
      
    } catch (error) {
      console.error('Error in saveSchedule:', error);
      throw error;
    }
  },
  
  // Get user schedules
  async getUserSchedules(): Promise<any[]> {
    console.log('=== GETTING ALL USER SCHEDULES ===');
    
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .order('updated_at', { ascending: false });
        
      if (error) {
        console.error('Error getting schedules:', error);
        throw error;
      }
      
      console.log('Retrieved schedules:', data);
      
      if (data && data.length > 0) {
        return data.map(schedule => ({
          email: schedule.user_email,
          user: schedule.user_name,
          month: schedule.month,
          dates: schedule.dates,
          notes: schedule.notes,
          editCount: schedule.edit_count
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error getting schedules:', error);
      return [];
    }
  },
  
  // Delete user schedule
  async deleteUserSchedule(userEmail: string): Promise<{ success: boolean }> {
    console.log('=== DELETING SCHEDULE ===');
    console.log('Deleting schedule for user:', userEmail);
    
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('user_email', userEmail);
        
      if (error) {
        console.error('Error deleting schedule:', error);
        throw error;
      }
      
      console.log('Schedule deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error deleting schedule:', error);
      return { success: false };
    }
  },
  
  // Reset user edit counter
  async resetEditCounter(userEmail: string): Promise<{ success: boolean }> {
    console.log('=== RESETTING EDIT COUNTER ===');
    console.log('Resetting edit counter for user:', userEmail);
    
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ edit_count: 0 })
        .eq('user_email', userEmail);
        
      if (error) {
        console.error('Error resetting edit counter:', error);
        throw error;
      }
      
      console.log('Edit counter reset successfully');
      return { success: true };
    } catch (error) {
      console.error('Error resetting edit counter:', error);
      return { success: false };
    }
  },
  
  // Set up real-time subscription for schedule changes
  setupRealtimeSubscription(callback: () => void) {
    console.log('=== SETTING UP REALTIME SUBSCRIPTION ===');
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
      console.log('Removing realtime subscription');
      supabase.removeChannel(channel);
    };
  }
};
