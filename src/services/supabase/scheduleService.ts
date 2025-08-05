import { supabase } from "./client";
import { systemSettingsService } from "./systemSettingsService";

// Auto-check and reset monthly counters
const checkMonthlyReset = async () => {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  
  try {
    const { data, error } = await supabase.rpc('check_and_reset_monthly_counters', {
      current_month: currentMonth
    });
    
    if (error) {
      console.error('Error checking monthly reset:', error);
    } else if (data) {
      console.log('Monthly edit counters reset successfully');
    }
  } catch (error) {
    console.error('Error in monthly reset check:', error);
  }
};

export const scheduleService = {
  // Check if user can submit schedule after 15th
  async canUserSubmitAfter15th(userEmail: string): Promise<boolean> {
    try {
      const setting = await systemSettingsService.getSystemSetting(`allow_submission_after_15th_${userEmail}`);
      return setting === 'true';
    } catch (error) {
      console.log('No specific permission found for user, defaulting to false');
      return false;
    }
  },

  // Validate if submission is allowed
  async validateSubmission(userEmail: string): Promise<{ allowed: boolean; reason?: string }> {
    const today = new Date();
    const dayOfMonth = today.getDate();
    
    // If it's before or on the 15th, always allow
    if (dayOfMonth <= 15) {
      return { allowed: true };
    }
    
    // After 15th, check user permission
    const canSubmit = await this.canUserSubmitAfter15th(userEmail);
    
    if (!canSubmit) {
      return { 
        allowed: false, 
        reason: 'Não é possível submeter escalas após o dia 15 do mês. Contacte o administrador se necessário.' 
      };
    }
    
    return { allowed: true };
  },

  // Save user schedule
  async saveSchedule(userEmail: string, userName: string, scheduleData: any): Promise<{ success: boolean; message?: string }> {
    console.log('=== SAVING SCHEDULE TO SUPABASE ===');
    console.log('User Email:', userEmail);
    console.log('User Name:', userName);
    console.log('Schedule Data:', scheduleData);
    
    try {
      // Check for monthly reset before validating submission
      await checkMonthlyReset();
      
      // Validate submission
      const validation = await this.validateSubmission(userEmail);
      if (!validation.allowed) {
        return { success: false, message: validation.reason };
      }

      const month = new Date().getFullYear() + '-' + String(new Date().getMonth() + 2).padStart(2, '0'); // Next month
      console.log('Month:', month);
      
      // Check if schedule already exists for THIS SPECIFIC USER
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
        // Update existing schedule for THIS USER - reset printed_at when user submits new schedule
        console.log('Updating existing schedule with ID:', existing.id, 'for user:', userEmail);
        result = await supabase
          .from('schedules')
          .update({
            user_name: userName,
            dates: scheduleData,
            edit_count: (existing.edit_count || 0) + 1,
            printed_at: null, // Reset print status when schedule is updated
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .eq('user_email', userEmail) // CRITICAL: Also filter by user email
          .select();
      } else {
        // Create new schedule for THIS USER
        console.log('Creating new schedule for user:', userEmail);
        result = await supabase
          .from('schedules')
          .insert({
            user_email: userEmail,
            user_name: userName,
            month: month,
            dates: scheduleData,
            edit_count: 1,
            printed_at: null
          })
          .select();
      }
      
      if (result.error) {
        console.error('Error saving schedule:', result.error);
        throw result.error;
      }
      
      console.log('Schedule saved successfully for user:', userEmail, result.data);
      
      // Send admin notification about the new/updated schedule
      try {
        const { error: notificationError } = await supabase
          .from('admin_notifications')
          .insert({
            message: `${userName} submeteu uma nova escala para ${month}`,
            user_email: userEmail,
            is_read: false
          });
        
        if (notificationError) {
          console.error('Error sending admin notification:', notificationError);
        } else {
          console.log('Admin notification sent successfully');
        }
      } catch (notificationError) {
        console.error('Failed to send admin notification:', notificationError);
      }
      
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
          editCount: schedule.edit_count,
          printedAt: schedule.printed_at
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error getting schedules:', error);
      return [];
    }
  },

  // Mark schedule as printed
  async markScheduleAsPrinted(userEmail: string): Promise<{ success: boolean }> {
    console.log('=== MARKING SCHEDULE AS PRINTED ===');
    console.log('User email:', userEmail);
    
    try {
      const month = new Date().getFullYear() + '-' + String(new Date().getMonth() + 2).padStart(2, '0');
      
      const { error } = await supabase
        .from('schedules')
        .update({ 
          printed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_email', userEmail)
        .eq('month', month);
        
      if (error) {
        console.error('Error marking schedule as printed:', error);
        throw error;
      }
      
      console.log('Schedule marked as printed successfully');
      return { success: true };
    } catch (error) {
      console.error('Error in markScheduleAsPrinted:', error);
      return { success: false };
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
