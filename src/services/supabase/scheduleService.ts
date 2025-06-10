
import { supabase } from "./client";

export const scheduleService = {
  // Get user schedules
  async getUserSchedules(): Promise<any[]> {
    console.log('=== GETTING ALL USER SCHEDULES ===');
    
    try {
      const { data: supabaseSchedules, error } = await supabase
        .from('schedules')
        .select('*')
        .order('updated_at', { ascending: false });
        
      if (error) {
        console.error('Error getting schedules from Supabase:', error);
        throw error;
      }
      
      console.log('Raw schedules from database:', supabaseSchedules);
      
      if (supabaseSchedules && supabaseSchedules.length > 0) {
        console.log(`Retrieved ${supabaseSchedules.length} schedules from Supabase`);
        const mappedSchedules = supabaseSchedules.map(schedule => {
          console.log('Processing schedule:', schedule);
          return {
            email: schedule.user_email,
            user: schedule.user_name,
            month: schedule.month,
            dates: schedule.dates,
            notes: schedule.notes,
            editCount: schedule.edit_count
          };
        });
        console.log('Mapped schedules:', mappedSchedules);
        return mappedSchedules;
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
    console.log('=== DELETING SCHEDULE ===');
    console.log('Deleting schedule for user:', userEmail);
    
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('user_email', userEmail);
        
      if (error) {
        console.error('Error deleting schedule from Supabase:', error);
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
        console.error('Error resetting edit counter in Supabase:', error);
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
