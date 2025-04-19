import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

interface User {
  id?: string;
  name: string;
  email: string;
  password?: string;
  mechanographic_number: string;
  role: 'admin' | 'user';
  active: boolean;
  needs_password_change?: boolean;
}

// Define types for Supabase tables to help TypeScript understand our database schema
type Tables = Database['public']['Tables'];
type UsersTable = Tables['users']['Row'];
type PasswordResetRequestsTable = Tables['password_reset_requests']['Row'];

export const supabaseService = {
  // Create a new user
  async createUser(userData: Omit<User, 'id' | 'active'>): Promise<User> {
    console.log('Supabase: Creating user', userData);
    
    const { data, error } = await supabase
      .from('users')
      .insert([{
        name: userData.name,
        email: userData.email,
        mechanographic_number: userData.mechanographic_number,
        role: userData.role,
        password_hash: '$2a$10$XO/2sFKr6!2XY9kaPL5DEO5P/hmEhaXbMSdqJjm1YsVqFYnNU1K1i',
        needs_password_change: true
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
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      mechanographic_number: data.mechanographic_number,
      role: data.role as 'admin' | 'user',
      active: data.active,
      needs_password_change: data.needs_password_change
    };
  },
  
  // Delete a user
  async deleteUser(userId: string): Promise<{ success: boolean }> {
    console.log('Supabase: Deleting user', userId);
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
    
    return { success: true };
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
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      mechanographic_number: data.mechanographic_number,
      role: data.role as 'admin' | 'user',
      active: data.active,
      needs_password_change: data.needs_password_change
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
    
    return data.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      mechanographic_number: user.mechanographic_number,
      role: user.role as 'admin' | 'user',
      active: user.active,
      needs_password_change: user.needs_password_change
    }));
  },
  
  // Save user schedule
  async saveUserSchedule(userEmail: string, scheduleData: any): Promise<{ success: boolean }> {
    console.log('Supabase: Saving schedule for user', userEmail, scheduleData);
    // This would be implemented with a schedules table
    return { success: true };
  },
  
  // Get user schedules
  async getUserSchedules(): Promise<any[]> {
    console.log('Supabase: Getting all user schedules');
    // This would be implemented with a schedules table
    return [];
  },
  
  // Request password reset
  async requestPasswordReset(email: string): Promise<{ success: boolean }> {
    console.log('Supabase: Password reset requested for', email);
    
    const { error } = await supabase
      .from('password_reset_requests')
      .insert([{ email, fulfilled: false }]);
    
    if (error) {
      console.error('Error requesting password reset:', error);
      throw error;
    }
    
    return { success: true };
  },
  
  // Get password reset requests
  async getPasswordResetRequests(): Promise<string[]> {
    const { data, error } = await supabase
      .from('password_reset_requests')
      .select('email')
      .eq('fulfilled', false);
    
    if (error) {
      console.error('Error fetching reset requests:', error);
      throw error;
    }
    
    if (!data) {
      return [];
    }
    
    return data.map(request => request.email);
  },
  
  // Reset password for user
  async resetPassword(email: string): Promise<{ success: boolean }> {
    console.log('Supabase: Resetting password for', email);
    
    // Update the user to default password and needs_password_change = true
    const { error: userError } = await supabase
      .from('users')
      .update({ 
        password_hash: '$2a$10$XO/2sFKr6!2XY9kaPL5DEO5P/hmEhaXbMSdqJjm1YsVqFYnNU1K1i',
        needs_password_change: true,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);
    
    if (userError) {
      console.error('Error resetting user password:', userError);
      throw userError;
    }
    
    // Mark reset requests as fulfilled
    const { error: requestError } = await supabase
      .from('password_reset_requests')
      .update({ fulfilled: true })
      .eq('email', email)
      .eq('fulfilled', false);
    
    if (requestError) {
      console.error('Error updating reset requests:', requestError);
      throw requestError;
    }
    
    return { success: true };
  },
  
  // Change password for user
  async changePassword(email: string, newPassword: string): Promise<{ success: boolean }> {
    console.log('Supabase: Changing password for', email);
    
    // In a real implementation, you would hash the password properly
    // This is just a simplified example
    const { error } = await supabase
      .from('users')
      .update({ 
        password_hash: newPassword,
        needs_password_change: false,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);
    
    if (error) {
      console.error('Error changing password:', error);
      throw error;
    }
    
    return { success: true };
  },
  
  // Check login credentials
  async checkLogin(email: string, password: string): Promise<{ success: boolean; user?: { email: string; role: string; needsPasswordChange: boolean } }> {
    console.log('Supabase: Checking login for', email);
    
    // In a real implementation, you would verify the password hash
    // For this example, we're just checking if the user exists
    const { data, error } = await supabase
      .from('users')
      .select('email, role, needs_password_change, password_hash, active')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      console.error('Error or user not found:', error);
      return { success: false };
    }
    
    if (!data.active) {
      console.log('User account is inactive');
      return { success: false };
    }
    
    // For default password 'CVAmares', the hash is always '$2a$10$XO/2sFKr6!2XY9kaPL5DEO5P/hmEhaXbMSdqJjm1YsVqFYnNU1K1i'
    // So we check if either the password is 'CVAmares' or matches the hash directly
    const passwordMatches = password === 'CVAmares' || password === data.password_hash;
    
    if (!passwordMatches) {
      console.log('Password does not match');
      return { success: false };
    }
    
    return { 
      success: true,
      user: {
        email: data.email,
        role: data.role,
        needsPasswordChange: data.needs_password_change
      }
    };
  }
};
