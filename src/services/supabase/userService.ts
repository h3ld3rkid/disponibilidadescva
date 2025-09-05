import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

interface User {
  id: string; // Made required to match component expectations
  name: string;
  email: string;
  password?: string;
  mechanographic_number: string;
  role: 'admin' | 'user';
  active: boolean;
  needs_password_change?: boolean;
  allow_late_submission?: boolean;
  telegram_chat_id?: string;
}

// Define types for Supabase tables to help TypeScript understand our database schema
type Tables = Database['public']['Tables'];
type UsersTable = Tables['users']['Row'];

export const userService = {
  // Create a new user - simplified without hashing
  async createUser(userData: Omit<User, 'id' | 'active'>): Promise<User & { temporaryPassword: string }> {
    console.log('Supabase: Creating user', userData);
    
    // Generate a simple default password
    const defaultPassword = 'CVAmares_' + Math.random().toString(36).substr(2, 8);

    const { data, error } = await supabase
      .from('users')
      .insert([{
        name: userData.name,
        email: userData.email,
        mechanographic_number: userData.mechanographic_number,
        role: userData.role,
        password_hash: defaultPassword, // Store plaintext for now
        needs_password_change: true,
        telegram_chat_id: null
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }
    
    if (!data) {
      throw new Error('No data returned from create user operation');
    }
    
    console.log('User created with temporary password:', defaultPassword);
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      mechanographic_number: data.mechanographic_number,
      role: data.role as 'admin' | 'user',
      active: data.active,
      needs_password_change: data.needs_password_change,
      allow_late_submission: false, // Default value since it's not in the database yet
      telegram_chat_id: data.telegram_chat_id,
      temporaryPassword: defaultPassword
    };
  },

  // Delete a user - Enhanced to use the Edge Function
  async deleteUser(userId: string): Promise<{ success: boolean; message?: string; email?: string }> {
    console.log('Supabase: Attempting to delete user with ID:', userId);
    
    try {
      // Call the Edge Function to delete the user
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });
      
      console.log('Supabase: Delete user function response:', data, error);
      
      if (error) {
        console.error('Error calling delete-user function:', error);
        return {
          success: false,
          message: `Function error: ${error.message}`
        };
      }
      
      if (!data || !data.success) {
        console.log('Function returned unsuccessful response:', data);
        return {
          success: false,
          message: data?.message || 'Unknown error'
        };
      }
      
      return {
        success: true,
        message: data.message || 'User deleted successfully',
        email: data.email // Return email for client-side cleanup
      };
    } catch (error: any) {
      console.error('Unexpected error in deleteUser:', error);
      return {
        success: false,
        message: `An unexpected error occurred: ${error.message || 'Unknown error'}`
      };
    }
  },
  
  // Update an existing user
  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    console.log('Supabase: Updating user', userId, userData);
    
    const updateData = {
      ...(userData.name && { name: userData.name }),
      ...(userData.email && { email: userData.email }),
      ...(userData.mechanographic_number && { mechanographic_number: userData.mechanographic_number }),
      ...(userData.role && { role: userData.role }),
      ...(userData.active !== undefined && { active: userData.active }),
      ...(userData.needs_password_change !== undefined && { needs_password_change: userData.needs_password_change }),
      ...(userData.telegram_chat_id !== undefined && { telegram_chat_id: userData.telegram_chat_id }),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }
    
    if (!data) {
      throw new Error('No data returned from update user operation');
    }

    // Handle allow_late_submission separately since it's not in the database table yet
    // For now, we'll use the system_settings approach
    if (userData.allow_late_submission !== undefined) {
      const { systemSettingsService } = await import('./systemSettingsService');
      await systemSettingsService.upsertSystemSetting(
        `allow_submission_after_15th_${data.email}`,
        userData.allow_late_submission.toString(),
        `Allow user ${data.email} to submit schedule after 15th of month`
      );
    }
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      mechanographic_number: data.mechanographic_number,
      role: data.role as 'admin' | 'user',
      active: data.active,
      needs_password_change: data.needs_password_change,
      allow_late_submission: userData.allow_late_submission,
      telegram_chat_id: data.telegram_chat_id
    };
  },
  
  // Toggle user active status
  async toggleUserStatus(userId: string): Promise<{ success: boolean; active: boolean }> {
    console.log('Supabase: Toggling user status', userId);
    
    // First get the current status
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('active')
      .eq('id', userId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching user status:', fetchError);
      throw fetchError;
    }
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const newStatus = !user.active;
    
    // Then update it
    const { error: updateError } = await supabase
      .from('users')
      .update({ active: newStatus, updated_at: new Date().toISOString() })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error updating user status:', updateError);
      throw updateError;
    }
    
    return {
      success: true,
      active: newStatus
    };
  },
  
  // Get all users
  async getAllUsers(): Promise<User[]> {
    console.log('Supabase: Getting all users');
    
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
    
    if (!data) {
      return [];
    }

    // For each user, check if they have late submission permission
    const { systemSettingsService } = await import('./systemSettingsService');
    const usersWithPermissions = await Promise.all(
      data.map(async (user) => {
        try {
          const setting = await systemSettingsService.getSystemSetting(`allow_submission_after_15th_${user.email}`);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            mechanographic_number: user.mechanographic_number,
            role: user.role as 'admin' | 'user',
            active: user.active,
            needs_password_change: user.needs_password_change,
            allow_late_submission: setting === 'true',
            telegram_chat_id: user.telegram_chat_id
          };
        } catch (error) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            mechanographic_number: user.mechanographic_number,
            role: user.role as 'admin' | 'user',
            active: user.active,
            needs_password_change: user.needs_password_change,
            allow_late_submission: false,
            telegram_chat_id: user.telegram_chat_id
          };
        }
      })
    );

    return usersWithPermissions;
  }
};
