import { supabase } from '@/integrations/supabase/client';

export interface SecurityLog {
  id: string;
  user_email: string;
  event_type: string;
  ip_address?: unknown;
  user_agent?: string;
  success: boolean;
  details?: any;
  created_at: string;
}

export const securityService = {
  // Get security logs for admin dashboard
  async getSecurityLogs(limit: number = 100): Promise<SecurityLog[]> {
    const { data, error } = await supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching security logs:', error);
      throw error;
    }

    return data || [];
  },

  // Get failed login attempts for a specific user
  async getFailedLoginAttempts(userEmail: string, hours: number = 24): Promise<SecurityLog[]> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const { data, error } = await supabase
      .from('security_logs')
      .select('*')
      .eq('user_email', userEmail)
      .eq('event_type', 'failed_login')
      .eq('success', false)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching failed login attempts:', error);
      throw error;
    }

    return data || [];
  },

  // Get suspicious activities
  async getSuspiciousActivities(hours: number = 24): Promise<SecurityLog[]> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const { data, error } = await supabase
      .from('security_logs')
      .select('*')
      .eq('event_type', 'suspicious_activity')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching suspicious activities:', error);
      throw error;
    }

    return data || [];
  },

  // Get security statistics
  async getSecurityStats(hours: number = 24): Promise<{
    totalLogins: number;
    failedLogins: number;
    suspiciousActivities: number;
    uniqueUsers: number;
  }> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    try {
      // Get total successful logins
      const { data: successfulLogins } = await supabase
        .from('security_logs')
        .select('user_email', { count: 'exact' })
        .eq('event_type', 'successful_login')
        .gte('created_at', since.toISOString());

      // Get failed logins
      const { data: failedLogins } = await supabase
        .from('security_logs')
        .select('user_email', { count: 'exact' })
        .eq('event_type', 'failed_login')
        .gte('created_at', since.toISOString());

      // Get suspicious activities
      const { data: suspicious } = await supabase
        .from('security_logs')
        .select('user_email', { count: 'exact' })
        .eq('event_type', 'suspicious_activity')
        .gte('created_at', since.toISOString());

      // Get unique users who logged in
      const { data: uniqueUsersData } = await supabase
        .from('security_logs')
        .select('user_email')
        .eq('event_type', 'successful_login')
        .gte('created_at', since.toISOString());

      const uniqueUsers = new Set(uniqueUsersData?.map(log => log.user_email) || []).size;

      return {
        totalLogins: successfulLogins?.length || 0,
        failedLogins: failedLogins?.length || 0,
        suspiciousActivities: suspicious?.length || 0,
        uniqueUsers
      };
    } catch (error) {
      console.error('Error getting security stats:', error);
      return {
        totalLogins: 0,
        failedLogins: 0,
        suspiciousActivities: 0,
        uniqueUsers: 0
      };
    }
  },

  // Configure secure session settings
  configureSecureSession(): void {
    // This would typically be configured at the server level
    // For now, we'll implement client-side security checks
    
    // Set up session timeout (30 minutes of inactivity)
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    let lastActivity = Date.now();
    
    const updateLastActivity = () => {
      lastActivity = Date.now();
    };

    const checkSessionTimeout = () => {
      if (Date.now() - lastActivity > SESSION_TIMEOUT) {
        // Session expired, force logout
        localStorage.removeItem('mysqlConnection');
        window.location.href = '/login';
      }
    };

    // Listen for user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, updateLastActivity, true);
    });

    // Check session timeout every minute
    setInterval(checkSessionTimeout, 60000);
  },

  // Validate session integrity
  validateSession(): boolean {
    const storedUser = localStorage.getItem('mysqlConnection');
    if (!storedUser) return false;

    try {
      const userData = JSON.parse(storedUser);
      
      // Check if required fields are present
      if (!userData.email || !userData.role || userData.isConnected !== true) {
        return false;
      }

      // Additional integrity checks can be added here
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  },

  // Enhanced password validation with detailed feedback
  validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('Deve ter pelo menos 8 caracteres');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Deve conter pelo menos uma letra maiúscula');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Deve conter pelo menos uma letra minúscula');
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Deve conter pelo menos um número');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Deve conter pelo menos um símbolo especial (!@#$%^&*)');
    }

    // Additional checks for stronger passwords
    if (password.length >= 12) score += 1;
    if (/(.)\1{2,}/.test(password)) {
      feedback.push('Evite repetir o mesmo caractere consecutivamente');
      score -= 1;
    }

    const isValid = score >= 5;
    
    return {
      isValid,
      score: Math.max(0, Math.min(6, score)),
      feedback: isValid ? ['Senha forte!'] : feedback
    };
  }
};