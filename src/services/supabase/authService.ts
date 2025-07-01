
import { supabase } from "./client";

export const authService = {
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
  
  // Reset password for user - FIXED: Now properly resets to default
  async resetPassword(email: string): Promise<{ success: boolean }> {
    console.log('Supabase: Resetting password for', email);
    
    // Hash for "CVAmares" - the correct default password hash
    const defaultPasswordHash = '$2a$10$XO/2sFKr6!2XY9kaPL5DEO5P/hmEhaXbMSdqJjm1YsVqFYnNU1K1i';
    
    // Update the user to default password and needs_password_change = true
    const { error: userError } = await supabase
      .from('users')
      .update({ 
        password_hash: defaultPasswordHash,
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
  async checkLogin(email: string, password: string): Promise<{ success: boolean; user?: { email: string; role: string; needsPasswordChange: boolean; name: string } }> {
    console.log('Supabase: Checking login for', email);
    
    // In a real implementation, you would verify the password hash
    // For this example, we're just checking if the user exists
    const { data, error } = await supabase
      .from('users')
      .select('email, role, needs_password_change, password_hash, active, name')
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
    
    // For our simplified implementation, we'll accept the password if:
    // 1. The password is 'CVAmares' (default password)
    // 2. The password matches what's stored in password_hash
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
        name: data.name,
        needsPasswordChange: data.needs_password_change
      }
    };
  }
};
