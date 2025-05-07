import { supabase } from "./client";

export const scheduleService = {
  // Migrate existing localStorage data to Supabase
  async migrateLocalStorageToSupabase(): Promise<{ success: boolean, migratedCount: number }> {
    console.log('Starting migration of localStorage data to Supabase');
    let migratedCount = 0;
    
    try {
      // Get all keys from localStorage
      const scheduleKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('userSchedule_')) {
          scheduleKeys.push(key);
        }
      }
      
      console.log(`Found ${scheduleKeys.length} schedule records in localStorage`);
      
      // Process each schedule
      for (const key of scheduleKeys) {
        try {
          const parts = key.split('_');
          const userEmail = parts[1];
          const month = parts[2] || 'default';
          const scheduleData = JSON.parse(localStorage.getItem(key) || '[]');
          
          // Get user info (name) if available
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
          
          // Get notes if available
          let notes = '';
          const notesKey = `userNotes_${userEmail}_${month}`;
          const notesData = localStorage.getItem(notesKey);
          if (notesData) {
            notes = notesData;
          }
          
          // Get edit count if available
          let editCount = 0;
          const editCountKey = `editCount_${userEmail}_${month}`;
          const editCountData = localStorage.getItem(editCountKey);
          if (editCountData) {
            editCount = parseInt(editCountData);
          }
          
          // Check if this data already exists in Supabase
          const { data: existingData } = await supabase
            .from('schedules')
            .select('id')
            .eq('user_email', userEmail)
            .eq('month', month)
            .maybeSingle();
            
          if (!existingData) {
            // Insert new record into Supabase
            const { error } = await supabase
              .from('schedules')
              .insert({
                user_email: userEmail,
                user_name: userName,
                month: month,
                dates: scheduleData,
                notes: notes,
                edit_count: editCount
              });
              
            if (error) {
              console.error(`Error migrating data for ${userEmail} (${month}):`, error);
            } else {
              migratedCount++;
              console.log(`Migrated data for ${userEmail} (${month}) to Supabase`);
            }
          } else {
            console.log(`Data for ${userEmail} (${month}) already exists in Supabase, skipping`);
          }
        } catch (error) {
          console.error(`Error processing localStorage key ${key}:`, error);
        }
      }
      
      console.log(`Migration completed. Migrated ${migratedCount} records to Supabase.`);
      return { success: true, migratedCount };
    } catch (error) {
      console.error('Error migrating data to Supabase:', error);
      return { success: false, migratedCount };
    }
  },
  
  // Save user schedule and notes together
  async saveUserScheduleWithNotes(userEmail: string, scheduleData: any, notes: string, userData?: { name: string }): Promise<{ success: boolean }> {
    console.log('Saving schedule and notes for user', userEmail, scheduleData);
    
    try {
      // Get user name from userData or use email as fallback
      const userName = userData?.name || userEmail;
      
      // Format the data for Supabase
      const month = scheduleData.month || 'default';
      const dates = scheduleData.dates || scheduleData;
      
      console.log(`Saving schedule for ${userEmail} (${month}):`, { dates, notes });
      
      // Check if this user already has a schedule for this month
      const { data: existingSchedule } = await supabase
        .from('schedules')
        .select('id, edit_count')
        .eq('user_email', userEmail)
        .eq('month', month)
        .maybeSingle();
      
      if (existingSchedule) {
        console.log(`Updating existing schedule for ${userEmail} (${month})`);
        // Update existing schedule
        const { error } = await supabase
          .from('schedules')
          .update({
            dates: dates,
            notes: notes,
            user_name: userName,
            edit_count: (existingSchedule.edit_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSchedule.id);
          
        if (error) {
          console.error('Error updating schedule:', error);
          throw error;
        }
      } else {
        console.log(`Creating new schedule for ${userEmail} (${month})`);
        // Insert new schedule
        const { error } = await supabase
          .from('schedules')
          .insert({
            user_email: userEmail,
            user_name: userName,
            month: month,
            dates: dates,
            notes: notes,
            edit_count: 0
          });
          
        if (error) {
          console.error('Error inserting new schedule:', error);
          throw error;
        }
      }
      
      // Also save to localStorage for backwards compatibility
      try {
        const localStorageKey = `userSchedule_${userEmail}_${month}`;
        localStorage.setItem(localStorageKey, JSON.stringify(dates));
        console.log(`Saved to localStorage: ${localStorageKey}`);
        
        const notesKey = `userNotes_${userEmail}_${month}`;
        localStorage.setItem(notesKey, notes);
        console.log(`Saved notes to localStorage: ${notesKey}`);
      } catch (e) {
        console.warn('Could not save to localStorage', e);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error saving schedule and notes:', error);
      return { success: false };
    }
  },
  
  // Save user schedule
  async saveUserSchedule(userEmail: string, scheduleData: any, userData?: { name: string }): Promise<{ success: boolean }> {
    console.log('Saving schedule for user', userEmail, scheduleData);
    
    try {
      // Get user name from userData or use email as fallback
      const userName = userData?.name || userEmail;
      
      // Format the data for Supabase
      const month = scheduleData.month || 'default';
      const dates = scheduleData.dates || scheduleData;
      
      console.log(`Saving schedule for ${userEmail} (${month}):`, { dates });
      
      // Check if this user already has a schedule for this month
      const { data: existingSchedule } = await supabase
        .from('schedules')
        .select('id, edit_count')
        .eq('user_email', userEmail)
        .eq('month', month)
        .maybeSingle();
      
      if (existingSchedule) {
        console.log(`Updating existing schedule for ${userEmail} (${month})`);
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
          
        if (error) {
          console.error('Error updating schedule:', error);
          throw error;
        }
      } else {
        console.log(`Creating new schedule for ${userEmail} (${month})`);
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
          
        if (error) {
          console.error('Error inserting new schedule:', error);
          throw error;
        }
      }
      
      // Also save to localStorage for backwards compatibility
      try {
        const localStorageKey = `userSchedule_${userEmail}_${month}`;
        localStorage.setItem(localStorageKey, JSON.stringify(dates));
        console.log(`Saved to localStorage: ${localStorageKey}`);
      } catch (e) {
        console.warn('Could not save to localStorage', e);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error saving schedule:', error);
      return { success: false };
    }
  },
  
  // Get user schedules
  async getUserSchedules(): Promise<any[]> {
    console.log('Getting all user schedules');
    
    try {
      // Get schedules from Supabase
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
      
      // If no data in Supabase, try localStorage as fallback
      console.log('No schedules found in Supabase, trying localStorage');
      const localSchedules = [];
      
      // Get all keys from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('userSchedule_')) {
          try {
            const parts = key.split('_');
            const userEmail = parts[1];
            const month = parts[2] || 'default';
            const scheduleData = JSON.parse(localStorage.getItem(key) || '[]');
            
            // Get user info (name) if available
            let userName = userEmail;
            const userInfoKey = `userInfo_${userEmail}`;
            const userInfoData = localStorage.getItem(userInfoKey);
            if (userInfoData) {
              try {
                const userData = JSON.parse(userInfoData);
                if (userData && userData.name) {
                  userName = userData.name;
                }
              } catch (e) { }
            }
            
            // Get notes if available
            let notes = '';
            const notesKey = `userNotes_${userEmail}_${month}`;
            const notesData = localStorage.getItem(notesKey);
            if (notesData) {
              notes = notesData;
            }
            
            // Get edit count if available
            let editCount = 0;
            const editCountKey = `editCount_${userEmail}_${month}`;
            const editCountData = localStorage.getItem(editCountKey);
            if (editCountData) {
              editCount = parseInt(editCountData);
            }
            
            localSchedules.push({
              email: userEmail,
              user: userName,
              month: month,
              dates: scheduleData,
              notes: notes,
              editCount: editCount
            });
          } catch (e) {
            console.error(`Error processing localStorage schedule key ${key}:`, e);
          }
        }
      }
      
      console.log(`Retrieved ${localSchedules.length} schedules from localStorage`);
      return localSchedules;
    } catch (error) {
      console.error('Error getting schedules:', error);
      return [];
    }
  },
  
  // Delete user schedule
  async deleteUserSchedule(userEmail: string): Promise<{ success: boolean }> {
    console.log('Deleting schedule for user', userEmail);
    
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('user_email', userEmail);
        
      if (error) {
        console.error('Error deleting schedule from Supabase:', error);
        throw error;
      }
      
      // Also delete from localStorage for backwards compatibility
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes(`userSchedule_${userEmail}`)) {
            localStorage.removeItem(key);
            console.log(`Removed from localStorage: ${key}`);
          }
        }
      } catch (e) {
        console.warn('Error cleaning localStorage:', e);
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
      // Reset edit counter in Supabase
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
  
  // Save user notes
  async saveUserNotes(userEmail: string, month: string, notes: string): Promise<{ success: boolean }> {
    console.log('Saving notes for user', userEmail, month, notes);
    
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
          
        if (error) {
          console.error('Error updating notes in Supabase:', error);
          throw error;
        }
      } else {
        // We need a schedule to store notes
        console.log('No existing schedule found for notes, creating a new one');
        const { error } = await supabase
          .from('schedules')
          .insert({
            user_email: userEmail,
            user_name: userEmail, // Use email as fallback name
            month: month,
            dates: [],  // Empty dates array
            notes: notes
          });
          
        if (error) {
          console.error('Error creating new schedule for notes:', error);
          throw error;
        }
      }
      
      // Also save to localStorage for backwards compatibility
      try {
        const localStorageKey = `userNotes_${userEmail}_${month}`;
        localStorage.setItem(localStorageKey, notes);
        console.log(`Saved notes to localStorage: ${localStorageKey}`);
      } catch (e) {
        console.warn('Could not save notes to localStorage:', e);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error saving notes:', error);
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
