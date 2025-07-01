
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
  
  // Reset password for user - Fixed to properly reset to CVAmares
  async resetPassword(email: string): Promise<{ success: boolean }> {
    console.log('Supabase: Resetting password for', email);
    
    try {
      // Update the user to default password hash for "CVAmares" and needs_password_change = true
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          password_hash: 'CVAmares', // Store as plain text for simplified matching
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
        // Don't throw here as the main operation succeeded
        console.log('Warning: Could not mark reset request as fulfilled, but password was reset');
      }
      
      console.log('Password successfully reset to CVAmares for user:', email);
      return { success: true };
    } catch (error) {
      console.error('Error in resetPassword:', error);
      throw error;
    }
  },
  
  // Change password for user
  async changePassword(email: string, newPassword: string): Promise<{ success: boolean }> {
    console.log('Supabase: Changing password for', email);
    
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
  
  // Check login credentials - Fixed to properly handle CVAmares default password
  async checkLogin(email: string, password: string): Promise<{ success: boolean; user?: { email: string; role: string; needsPasswordChange: boolean; name: string } }> {
    console.log('Supabase: Checking login for', email);
    
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
    
    // Check if password matches
    const passwordMatches = password === data.password_hash || password === 'CVAmares';
    
    if (!passwordMatches) {
      console.log('Password does not match');
      return { success: false };
    }
    
    console.log('Login successful for user:', email);
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
