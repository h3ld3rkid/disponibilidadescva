
import { supabase } from "./client";
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

export const userService = {
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

  // Delete a user - Enhanced with detailed logging
  async deleteUser(userId: string): Promise<{ success: boolean; message?: string; email?: string }> {
    console.log('Supabase: Attempting to delete user with ID:', userId);
    
    try {
      // First, get the user email which we'll need for local storage cleanup
      console.log('Supabase: Fetching user data before deletion');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();
      
      console.log('Supabase: User fetch result:', { userData, error: userError?.message });
      
      if (userError) {
        console.error('Error fetching user before deletion:', userError);
        return {
          success: false,
          message: `Could not find user: ${userError.message}`
        };
      }
      
      if (!userData) {
        console.log('Supabase: User not found for ID:', userId);
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Delete user from the database
      console.log('Supabase: Attempting to delete user from database');
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      console.log('Supabase: Delete operation result:', { error: deleteError?.message });
      
      if (deleteError) {
        console.error('Error deleting user:', deleteError);
        return {
          success: false,
          message: `Failed to delete user: ${deleteError.message}`
        };
      }
      
      console.log('User successfully deleted from database:', userId, 'Email:', userData.email);
      return {
        success: true,
        message: 'User deleted successfully',
        email: userData.email // Return email for client-side cleanup
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
  }
};
