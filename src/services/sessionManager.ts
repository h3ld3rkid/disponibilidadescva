import { supabaseService } from '@/services/supabase';

export interface SessionInfo {
  email: string;
  role: string;
  isConnected: boolean;
  mechanographic_number?: string;
  name?: string;
  loginTime: number; // timestamp
  expiresAt: number; // timestamp
}

const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const SESSION_KEY = 'mysqlConnection';

export const sessionManager = {
  // Create a new session with expiration
  createSession: (userInfo: Omit<SessionInfo, 'loginTime' | 'expiresAt'>): SessionInfo => {
    const now = Date.now();
    const session: SessionInfo = {
      ...userInfo,
      loginTime: now,
      expiresAt: now + SESSION_DURATION
    };
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  // Get current session if valid
  getCurrentSession: (): SessionInfo | null => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;

      const session: SessionInfo = JSON.parse(stored);
      const now = Date.now();

      // Check if session has expired
      if (now > session.expiresAt) {
        console.log('Session expired, clearing storage');
        sessionManager.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error parsing session:', error);
      sessionManager.clearSession();
      return null;
    }
  },

  // Check if session is valid
  isSessionValid: (): boolean => {
    const session = sessionManager.getCurrentSession();
    return session !== null;
  },

  // Clear the session
  clearSession: (): void => {
    localStorage.removeItem(SESSION_KEY);
  },

  // Refresh session (extend expiration)
  refreshSession: (): SessionInfo | null => {
    const session = sessionManager.getCurrentSession();
    if (!session) return null;

    const now = Date.now();
    const refreshedSession: SessionInfo = {
      ...session,
      expiresAt: now + SESSION_DURATION
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(refreshedSession));
    return refreshedSession;
  },

  // Get time remaining in session (in minutes)
  getTimeRemaining: (): number => {
    const session = sessionManager.getCurrentSession();
    if (!session) return 0;

    const now = Date.now();
    const remaining = Math.max(0, session.expiresAt - now);
    return Math.floor(remaining / 1000 / 60); // Convert to minutes
  }
};