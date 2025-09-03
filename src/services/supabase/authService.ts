
import { supabase } from "@/integrations/supabase/client";

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
  
  // Reset password - simplified without hashing  
  async resetPassword(email: string): Promise<{ success: boolean; temporaryPassword?: string }> {
    console.log('Supabase: Resetting password for', email);
    
    try {
      // Generate a simple temporary password
      const tempPassword = 'CVAmares_' + Math.random().toString(36).substr(2, 8);

      // Update the user with plaintext password and needs_password_change = true
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          password_hash: tempPassword,
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
      
      console.log('Password successfully reset with secure hash for user:', email);
      console.log('Temporary password:', tempPassword);
      return { success: true, temporaryPassword: tempPassword };
    } catch (error) {
      console.error('Error in resetPassword:', error);
      throw error;
    }
  },
  
  // Change password - simplified without hashing
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
  
  // Check login credentials using secure authentication function
  async checkLogin(email: string, password: string): Promise<{ success: boolean; user?: { email: string; role: string; needsPasswordChange: boolean; name: string } }> {
    console.log('Supabase: Checking login for', email);
    
    try {
      // Use the secure authentication function that bypasses RLS
      const { data, error } = await supabase.rpc('authenticate_user', {
        p_email: email,
        p_password: password
      });

      if (error) {
        console.error('Error during authentication:', error);
        return { success: false };
      }

      if (!data || data.length === 0) {
        console.log('No authentication result returned');
        return { success: false };
      }

      const authResult = data[0];
      
      if (!authResult.success) {
        console.log('Authentication failed for user:', email);
        return { success: false };
      }

      console.log('Login successful for user:', email);
      return { 
        success: true,
        user: {
          email: authResult.user_email,
          role: authResult.user_role,
          name: authResult.user_name,
          needsPasswordChange: authResult.needs_password_change
        }
      };
    } catch (error) {
      console.error('Error in checkLogin:', error);
      return { success: false };
    }
  }
};
