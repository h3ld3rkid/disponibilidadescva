import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, LogOut } from 'lucide-react';
import { sessionManager } from '@/services/sessionManager';
import { useToast } from '@/hooks/use-toast';

const SessionTimer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = sessionManager.getTimeRemaining();
      setTimeRemaining(remaining);

      // Show warning when 10 minutes or less remaining
      if (remaining <= 10 && remaining > 0) {
        setShowWarning(true);
      } else if (remaining === 0) {
        // Session expired
        handleSessionExpired();
      } else {
        setShowWarning(false);
      }
    };

    // Update immediately
    updateTimer();

    // Update every minute
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleSessionExpired = () => {
    sessionManager.clearSession();
    toast({
      title: "Sessão Expirada",
      description: "A sua sessão expirou após 2 horas. Por favor, inicie sessão novamente.",
      variant: "destructive",
    });
    navigate('/login');
  };

  const handleExtendSession = () => {
    const refreshed = sessionManager.refreshSession();
    if (refreshed) {
      setShowWarning(false);
      toast({
        title: "Sessão Renovada",
        description: "A sua sessão foi renovada por mais 2 horas.",
        variant: "default",
      });
    }
  };

  const handleLogout = () => {
    sessionManager.clearSession();
    toast({
      title: "Sessão Terminada",
      description: "Saiu da aplicação com sucesso.",
      variant: "default",
    });
    navigate('/login');
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (!showWarning) {
    return null;
  }

  return (
    <Alert className="mx-4 mb-4 border-orange-200 bg-orange-50">
      <Clock className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-orange-800">
          A sua sessão expira em {formatTime(timeRemaining)}. Deseja continuar?
        </span>
        <div className="flex gap-2 ml-4">
          <Button size="sm" variant="outline" onClick={handleLogout}>
            <LogOut className="h-3 w-3 mr-1" />
            Sair
          </Button>
          <Button size="sm" onClick={handleExtendSession}>
            Continuar
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default SessionTimer;