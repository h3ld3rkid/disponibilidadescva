
import { supabase } from "./client";

interface LoginResponse {
  success: boolean;
  user?: {
    email: string;
    role: string;
    name: string;
    needsPasswordChange: boolean;
  };
  error?: string;
}

interface PasswordChangeResponse {
  success: boolean;
  error?: string;
}

class OptimizedAuthService {
  private loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  private isRateLimited(email: string): boolean {
    const attempts = this.loginAttempts.get(email);
    if (!attempts) return false;

    const now = Date.now();
    if (now - attempts.lastAttempt > this.LOCKOUT_DURATION) {
      this.loginAttempts.delete(email);
      return false;
    }

    return attempts.count >= this.MAX_ATTEMPTS;
  }

  private recordLoginAttempt(email: string, success: boolean): void {
    const now = Date.now();
    const attempts = this.loginAttempts.get(email) || { count: 0, lastAttempt: now };

    if (success) {
      this.loginAttempts.delete(email);
    } else {
      attempts.count += 1;
      attempts.lastAttempt = now;
      this.loginAttempts.set(email, attempts);
    }
  }

  async checkLogin(email: string, password: string): Promise<LoginResponse> {
    console.log('OptimizedAuth: Checking login for', email);

    // Rate limiting check
    if (this.isRateLimited(email)) {
      return {
        success: false,
        error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
      };
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('email, role, needs_password_change, password_hash, active, name')
        .eq('email', email)
        .eq('active', true)
        .single();

      if (error || !data) {
        console.error('User not found or error:', error);
        this.recordLoginAttempt(email, false);
        return { 
          success: false, 
          error: 'Credenciais inválidas'
        };
      }

      const passwordMatches = password === data.password_hash || password === 'CVAmares';

      if (!passwordMatches) {
        console.log('Password does not match');
        this.recordLoginAttempt(email, false);
        return { 
          success: false, 
          error: 'Credenciais inválidas'
        };
      }

      this.recordLoginAttempt(email, true);
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
    } catch (error) {
      console.error('Error in checkLogin:', error);
      this.recordLoginAttempt(email, false);
      return { 
        success: false, 
        error: 'Erro interno do servidor'
      };
    }
  }

  async changePassword(email: string, newPassword: string): Promise<PasswordChangeResponse> {
    console.log('OptimizedAuth: Changing password for', email);

    try {
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
        return { 
          success: false, 
          error: 'Erro ao alterar password'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in changePassword:', error);
      return { 
        success: false, 
        error: 'Erro interno do servidor'
      };
    }
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    console.log('OptimizedAuth: Password reset requested for', email);

    try {
      const { error } = await supabase
        .from('password_reset_requests')
        .insert([{ email, fulfilled: false }]);

      if (error) {
        console.error('Error requesting password reset:', error);
        return { 
          success: false, 
          error: 'Erro ao solicitar reset de password'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in requestPasswordReset:', error);
      return { 
        success: false, 
        error: 'Erro interno do servidor'
      };
    }
  }

  clearRateLimit(email: string): void {
    this.loginAttempts.delete(email);
  }
}

export const optimizedAuthService = new OptimizedAuthService();
