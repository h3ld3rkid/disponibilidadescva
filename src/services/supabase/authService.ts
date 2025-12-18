import { supabase } from "@/integrations/supabase/client";
import { z } from 'zod';

// Validação de inputs
const emailSchema = z.string().email().max(255);
const passwordSchema = z.string().min(6).max(100);

export const authService = {
  // Request password reset
  async requestPasswordReset(email: string): Promise<{ success: boolean }> {
    // Validar email
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      throw new Error('Email inválido');
    }
    
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
    // Validar email
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      throw new Error('Email inválido');
    }
    
    console.log('Supabase: Resetting password for', email);
    
    try {
      // Generate a simple temporary password
      const tempPassword = 'CVAmares_' + Math.random().toString(36).substr(2, 8);

      // Hash da senha temporária
      const { data: hashData, error: hashError } = await supabase.functions.invoke('hash-password', {
        body: { password: tempPassword }
      });

      if (hashError || !hashData?.hash) {
        console.error('Error hashing password:', hashError);
        throw new Error('Erro ao criar senha temporária');
      }

      // Update the user with hashed password and needs_password_change = true
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          password_hash: hashData.hash,
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
    // Validar inputs
    const emailValidation = emailSchema.safeParse(email);
    const passwordValidation = passwordSchema.safeParse(newPassword);
    
    if (!emailValidation.success) {
      throw new Error('Email inválido');
    }
    
    if (!passwordValidation.success) {
      throw new Error('A senha deve ter no mínimo 6 caracteres');
    }
    
    console.log('Supabase: Changing password for', email);
    
    // Hash da nova senha
    const { data: hashData, error: hashError } = await supabase.functions.invoke('hash-password', {
      body: { password: newPassword }
    });

    if (hashError || !hashData?.hash) {
      console.error('Error hashing password:', hashError);
      throw new Error('Erro ao alterar senha');
    }

    const { error } = await supabase
      .from('users')
      .update({ 
        password_hash: hashData.hash,
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
  async checkLogin(email: string, password: string): Promise<{ 
    success: boolean; 
    user?: { email: string; role: string; needsPasswordChange: boolean; name: string };
    locked?: boolean;
    remainingAttempts?: number;
    message?: string;
  }> {
    // Validar inputs
    const emailValidation = emailSchema.safeParse(email);
    const passwordValidation = passwordSchema.safeParse(password);
    
    if (!emailValidation.success || !passwordValidation.success) {
      console.log('Invalid input format');
      return { success: false };
    }
    
    console.log('Supabase: Checking login for', email);
    
    try {
      // Usar edge function segura com bcrypt
      const { data, error } = await supabase.functions.invoke('verify-password', {
        body: {
          email: email.trim().toLowerCase(),
          password: password
        }
      });

      if (error) {
        console.error('Error during authentication:', error);
        return { success: false };
      }

      if (!data?.success) {
        console.log('Authentication failed');
        return { 
          success: false,
          locked: data?.locked,
          remainingAttempts: data?.remainingAttempts,
          message: data?.message
        };
      }

      console.log('Login successful for user:', email);
      return { 
        success: true,
        user: data.user
      };
    } catch (error) {
      console.error('Error in checkLogin:', error);
      return { success: false };
    }
  }
};
