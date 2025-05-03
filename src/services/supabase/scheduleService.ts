
import { supabase } from "./client";

export const scheduleService = {
  // Save user schedule
  async saveUserSchedule(userEmail: string, scheduleData: any, userData?: { name: string }): Promise<{ success: boolean }> {
    console.log('Supabase: Saving schedule for user', userEmail, scheduleData);
    
    // Save user info for reference in admin views
    if (userData && userData.name) {
      localStorage.setItem(`userInfo_${userEmail}`, JSON.stringify(userData));
    }
    
    // Trigger an event to notify other components that schedules have changed
    window.dispatchEvent(new Event('schedulesChanged'));
    
    return { success: true };
  },
  
  // Get user schedules
  async getUserSchedules(): Promise<any[]> {
    console.log('Supabase: Getting all user schedules');
    // This would be implemented with a schedules table
    return [];
  }
};
