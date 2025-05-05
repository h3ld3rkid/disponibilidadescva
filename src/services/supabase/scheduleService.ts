
import { supabase } from "./client";

export const scheduleService = {
  // Save user schedule
  async saveUserSchedule(userEmail: string, scheduleData: any, userData?: { name: string }): Promise<{ success: boolean }> {
    console.log('Supabase: Saving schedule for user', userEmail, scheduleData);
    
    try {
      // Get user name from userData or use email as fallback
      const userName = userData?.name || userEmail;
      
      // Format the data for Supabase
      const month = scheduleData.month || 'default';
      const dates = scheduleData.dates || scheduleData;
      
      // Check if this user already has a schedule for this month
      const { data: existingSchedule } = await supabase
        .from('schedules')
        .select('id, edit_count')
        .eq('user_email', userEmail)
        .eq('month', month)
        .maybeSingle();
      
      if (existingSchedule) {
        // Update existing schedule
        const { error } = await supabase
          .from('schedules')
          .update({
            dates: dates,
            user_name: userName,
            edit_count: (existingSchedule.edit_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSchedule.id);
          
        if (error) throw error;
      } else {
        // Insert new schedule
        const { error } = await supabase
          .from('schedules')
          .insert({
            user_email: userEmail,
            user_name: userName,
            month: month,
            dates: dates,
            edit_count: 0
          });
          
        if (error) throw error;
      }
      
      // Save user info for reference (for backward compatibility)
      if (userData && userData.name) {
        localStorage.setItem(`userInfo_${userEmail}`, JSON.stringify(userData));
      }
      
      // For backward compatibility, also save to localStorage
      localStorage.setItem(`userSchedule_${userEmail}_${month}`, JSON.stringify(dates));
      
      // Trigger an event to notify other components that schedules have changed
      window.dispatchEvent(new Event('schedulesChanged'));
      
      return { success: true };
    } catch (error) {
      console.error('Error saving schedule:', error);
      return { success: false };
    }
  },
  
  // Get user schedules
  async getUserSchedules(): Promise<any[]> {
    console.log('Supabase: Getting all user schedules');
    
    try {
      // Get schedules from Supabase
      const { data: supabaseSchedules, error } = await supabase
        .from('schedules')
        .select('*')
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      
      if (supabaseSchedules && supabaseSchedules.length > 0) {
        return supabaseSchedules.map(schedule => ({
          email: schedule.user_email,
          user: schedule.user_name,
          month: schedule.month,
          dates: schedule.dates,
          notes: schedule.notes,
          editCount: schedule.edit_count
        }));
      }
      
      // Fallback to localStorage for backward compatibility
      const schedules: any[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('userSchedule_')) {
          try {
            const parts = key.split('_');
            const userEmail = parts[1];
            const monthInfo = parts[2];
            const scheduleData = JSON.parse(localStorage.getItem(key) || '[]');
            
            // Get user name
            let userName = userEmail;
            const userInfoKey = `userInfo_${userEmail}`;
            const userInfoData = localStorage.getItem(userInfoKey);
            if (userInfoData) {
              try {
                const userData = JSON.parse(userInfoData);
                if (userData && userData.name) {
                  userName = userData.name;
                }
              } catch (e) {
                console.error(`Error parsing user info for ${userEmail}:`, e);
              }
            }
            
            schedules.push({
              email: userEmail,
              user: userName,
              month: monthInfo || 'default',
              dates: scheduleData
            });
          } catch (error) {
            console.error(`Error processing schedule key ${key}:`, error);
          }
        }
      }
      
      return schedules;
    } catch (error) {
      console.error('Error getting schedules:', error);
      return [];
    }
  },
  
  // Delete user schedule
  async deleteUserSchedule(userEmail: string): Promise<{ success: boolean }> {
    console.log('Supabase: Deleting schedule for user', userEmail);
    
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('user_email', userEmail);
        
      if (error) throw error;
      
      // For backward compatibility, delete from localStorage too
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`userSchedule_${userEmail}`)) {
          localStorage.removeItem(key);
        }
      }
      
      // Trigger an event to notify other components that schedules have changed
      window.dispatchEvent(new Event('schedulesChanged'));
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting schedule:', error);
      return { success: false };
    }
  },
  
  // Reset user edit counter
  async resetEditCounter(userEmail: string): Promise<{ success: boolean }> {
    console.log('Supabase: Resetting edit counter for user', userEmail);
    
    try {
      // Reset edit counter in Supabase
      const { error } = await supabase
        .from('schedules')
        .update({ edit_count: 0 })
        .eq('user_email', userEmail);
        
      if (error) throw error;
      
      // For backward compatibility, reset in localStorage too
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`editCount_${userEmail}`)) {
          localStorage.setItem(key, '0');
        }
      }
      
      // Trigger an event to notify other components that schedules have changed
      window.dispatchEvent(new Event('schedulesChanged'));
      
      return { success: true };
    } catch (error) {
      console.error('Error resetting edit counter:', error);
      return { success: false };
    }
  },
  
  // Save user notes
  async saveUserNotes(userEmail: string, month: string, notes: string): Promise<{ success: boolean }> {
    console.log('Supabase: Saving notes for user', userEmail, month);
    
    try {
      // Check if this user already has a schedule for this month
      const { data: existingSchedule } = await supabase
        .from('schedules')
        .select('id')
        .eq('user_email', userEmail)
        .eq('month', month)
        .maybeSingle();
      
      if (existingSchedule) {
        // Update existing schedule with notes
        const { error } = await supabase
          .from('schedules')
          .update({
            notes: notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSchedule.id);
          
        if (error) throw error;
      } else {
        // We need a schedule to store notes
        console.error('No schedule found to store notes');
        return { success: false };
      }
      
      // For backward compatibility, also save to localStorage
      localStorage.setItem(`userNotes_${userEmail}_${month}`, notes);
      
      return { success: true };
    } catch (error) {
      console.error('Error saving notes:', error);
      return { success: false };
    }
  }
};
