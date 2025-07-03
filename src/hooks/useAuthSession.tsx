
import { useState, useEffect, useCallback } from 'react';

interface UserSession {
  email: string;
  role: string;
  name?: string;
  isConnected: boolean;
  expiresAt: number;
}

const SESSION_DURATION = 60 * 60 * 1000; // 1 hora em milliseconds
const SESSION_KEY = 'mysqlConnection';

export const useAuthSession = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isSessionValid = useCallback((sessionData: UserSession): boolean => {
    const now = Date.now();
    return sessionData.expiresAt > now;
  }, []);

  const createSession = useCallback((userData: { email: string; role: string; name?: string }) => {
    const sessionData: UserSession = {
      ...userData,
      isConnected: true,
      expiresAt: Date.now() + SESSION_DURATION
    };
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    setSession(sessionData);
    return sessionData;
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  const refreshSession = useCallback(() => {
    if (session) {
      const refreshedSession = {
        ...session,
        expiresAt: Date.now() + SESSION_DURATION
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(refreshedSession));
      setSession(refreshedSession);
    }
  }, [session]);

  const loadSession = useCallback(() => {
    try {
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) {
        const sessionData: UserSession = JSON.parse(storedSession);
        
        if (isSessionValid(sessionData)) {
          setSession(sessionData);
        } else {
          clearSession();
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [isSessionValid, clearSession]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Auto refresh session every 30 minutes
  useEffect(() => {
    if (session && isSessionValid(session)) {
      const interval = setInterval(() => {
        const now = Date.now();
        const timeUntilExpiry = session.expiresAt - now;
        
        // Refresh if less than 15 minutes until expiry
        if (timeUntilExpiry < 15 * 60 * 1000 && timeUntilExpiry > 0) {
          refreshSession();
        } else if (timeUntilExpiry <= 0) {
          clearSession();
        }
      }, 5 * 60 * 1000); // Check every 5 minutes

      return () => clearInterval(interval);
    }
  }, [session, isSessionValid, refreshSession, clearSession]);

  return {
    session,
    isLoading,
    createSession,
    clearSession,
    refreshSession,
    isSessionValid: session ? isSessionValid(session) : false
  };
};
