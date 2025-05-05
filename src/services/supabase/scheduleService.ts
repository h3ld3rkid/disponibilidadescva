
import { supabase } from "./client";

export const scheduleService = {
  // Save user schedule
  async saveUserSchedule(userEmail: string, scheduleData: any, userData?: { name: string }): Promise<{ success: boolean }> {
    console.log('Supabase: Saving schedule for user', userEmail, scheduleData);
    
    try {
      // Save the schedule data to localStorage for backward compatibility
      const key = `userSchedule_${userEmail}_${scheduleData.month || 'default'}`;
      localStorage.setItem(key, JSON.stringify(scheduleData.dates || scheduleData));
      
      // Save user info for reference in admin views (for backward compatibility)
      if (userData && userData.name) {
        localStorage.setItem(`userInfo_${userEmail}`, JSON.stringify(userData));
      }
      
      // Save to Supabase (ideally this would be a proper table in the future)
      // For now, just store as a JSON field with user reference in a future schedules table
      
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
    // This would be implemented with a schedules table
    
    // For now, read from localStorage for backward compatibility
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
  }
};
