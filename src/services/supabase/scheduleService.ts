import { supabase } from "./client";

export const scheduleService = {
  // Save user schedule and notes together (simplified and fixed)
  async saveUserScheduleWithNotes(userEmail: string, scheduleData: any, notes: string, userData?: { name: string }): Promise<{ success: boolean }> {
    console.log('=== SAVING SCHEDULE ===');
    console.log('User Email:', userEmail);
    console.log('Schedule Data:', scheduleData);
    console.log('Notes:', notes);
    console.log('User Data:', userData);
    
    try {
      const userName = userData?.name || userEmail;
      const month = scheduleData.month || 'default';
      
      // Ensure we have arrays for dates and overnights
      const dates = Array.isArray(scheduleData.dates) ? scheduleData.dates : [];
      const overnights = Array.isArray(scheduleData.overnights) ? scheduleData.overnights : [];
      
      // Combine all selections for storage
      const allSelections = {
        shifts: dates,
        overnights: overnights
      };

      console.log('Prepared data for storage:', {
        email: userEmail,
        month: month,
        allSelections: allSelections,
        notes: notes
      });

      // Check if record already exists
      const { data: existingRecord, error: selectError } = await supabase
        .from('schedules')
        .select('id, edit_count')
        .eq('user_email', userEmail)
        .eq('month', month)
        .maybeSingle();
      
      if (selectError) {
        console.error('Error checking existing record:', selectError);
        throw selectError;
      }

      if (existingRecord) {
        console.log('Updating existing record:', existingRecord.id);
        
        const { data: updateData, error: updateError } = await supabase
          .from('schedules')
          .update({
            user_name: userName,
            dates: allSelections,
            notes: notes,
            edit_count: (existingRecord.edit_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id)
          .select();
          
        if (updateError) {
          console.error('Error updating schedule:', updateError);
          throw updateError;
        }
        
        console.log('Successfully updated schedule:', updateData);
      } else {
        console.log('Creating new schedule record');
        
        const { data: insertData, error: insertError } = await supabase
          .from('schedules')
          .insert({
            user_email: userEmail,
            user_name: userName,
            month: month,
            dates: allSelections,
            notes: notes,
            edit_count: 1
          })
          .select();
          
        if (insertError) {
          console.error('Error inserting schedule:', insertError);
          throw insertError;
        }
        
        console.log('Successfully inserted new schedule:', insertData);
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
      } else {
        console.log('Verified saved data:', verifyData);
      }
      
      console.log('=== SCHEDULE SAVED SUCCESSFULLY ===');
      return { success: true };
    } catch (error) {
      console.error('=== ERROR SAVING SCHEDULE ===', error);
      return { success: false };
    }
  },

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
