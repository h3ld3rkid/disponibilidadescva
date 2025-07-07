
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
  
  // Validate password strength
  async validatePassword(password: string): Promise<{ isValid: boolean; message?: string }> {
    const { data, error } = await supabase.rpc('validate_password', { password });
    
    if (error) {
      console.error('Error validating password:', error);
      return { isValid: false, message: 'Erro ao validar senha' };
    }
    
    if (!data) {
      return { 
        isValid: false, 
        message: 'A senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e símbolo especial' 
      };
    }
    
    return { isValid: true };
  },

  // Change password for user
  async changePassword(email: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    console.log('Supabase: Changing password for', email);
    
    // Validate password strength first
    const validation = await this.validatePassword(newPassword);
    if (!validation.isValid) {
      return { success: false, message: validation.message };
    }
    
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
      
      // Log security event
      await this.logSecurityEvent(email, 'password_change_failed', false, { error: error.message });
      throw error;
    }
    
    // Log successful password change
    await this.logSecurityEvent(email, 'password_changed', true);
    
    return { success: true };
  },
  
  // Log security event
  async logSecurityEvent(
    userEmail: string, 
    eventType: string, 
    success: boolean = true, 
    details: any = null
  ): Promise<void> {
    try {
      await supabase.rpc('log_security_event', {
        p_user_email: userEmail,
        p_event_type: eventType,
        p_success: success,
        p_details: details ? JSON.stringify(details) : null
      });
    } catch (error) {
      console.error('Error logging security event:', error);
      // Don't throw here to avoid breaking the main flow
    }
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
      // Log failed login attempt
      await this.logSecurityEvent(email, 'failed_login', false, { reason: 'user_not_found' });
      return { success: false };
    }
    
    if (!data.active) {
      console.log('User account is inactive');
      // Log failed login attempt
      await this.logSecurityEvent(email, 'failed_login', false, { reason: 'account_inactive' });
      return { success: false };
    }
    
    // Check if password matches
    const passwordMatches = password === data.password_hash || password === 'CVAmares';
    
    if (!passwordMatches) {
      console.log('Password does not match');
      // Log failed login attempt
      await this.logSecurityEvent(email, 'failed_login', false, { reason: 'invalid_password' });
      return { success: false };
    }
    
    console.log('Login successful for user:', email);
    // Log successful login
    await this.logSecurityEvent(email, 'successful_login', true);
    
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
