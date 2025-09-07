import React from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushNotificationManagerProps {
  userEmail?: string;
  className?: string;
}

export const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({
  userEmail,
  className
}) => {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe
  } = usePushNotifications(userEmail);

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const getButtonText = () => {
    if (isLoading) return 'Processando...';
    if (isSubscribed) return 'Desativar Notificações';
    return 'Ativar Notificações Push';
  };

  const getDescription = () => {
    if (permission === 'denied') {
      return 'Notificações foram negadas. Ative nas configurações do navegador.';
    }
    if (isSubscribed) {
      return 'Você receberá notificações sobre escalas, trocas de turno e anúncios importantes.';
    }
    return 'Receba notificações push sobre escalas, trocas de turno e anúncios importantes, mesmo quando a aplicação não estiver aberta.';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isSubscribed ? (
            <Bell className="h-5 w-5 text-green-600" />
          ) : (
            <BellOff className="h-5 w-5 text-gray-500" />
          )}
          Notificações Push
        </CardTitle>
        <CardDescription>
          {getDescription()}
        </CardDescription>
      </CardHeader>
      
      {permission !== 'denied' && (
        <CardContent>
          <Button
            onClick={handleToggle}
            disabled={isLoading}
            variant={isSubscribed ? "outline" : "default"}
            className="w-full"
          >
            {isSubscribed ? (
              <BellOff className="h-4 w-4 mr-2" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            {getButtonText()}
          </Button>
        </CardContent>
      )}
    </Card>
  );
};