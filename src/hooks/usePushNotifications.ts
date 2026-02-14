import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const usePushNotifications = (userEmail?: string) => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Verificar suporte para notificações push
  useEffect(() => {
    const checkSupport = () => {
      const supported = 
        'serviceWorker' in navigator && 
        'PushManager' in window && 
        'Notification' in window;
      
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Verificar se já está subscrito
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !userEmail || !('serviceWorker' in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await (registration as any).pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };

    checkSubscription();
  }, [isSupported, userEmail]);

  // Solicitar permissão para notificações
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Não Suportado",
        description: "Seu navegador não suporta notificações push",
        variant: "destructive",
      });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        toast({
          title: "Permissão Concedida",
          description: "Notificações push foram ativadas",
        });
        return true;
      } else if (permission === 'denied') {
        toast({
          title: "Permissão Negada",
          description: "Ative as notificações nas configurações do navegador",
          variant: "destructive",
        });
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({
        title: "Erro",
        description: "Erro ao solicitar permissão para notificações",
        variant: "destructive",
      });
      return false;
    }
  }, [isSupported, toast]);

  // Subscrever para notificações push
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !userEmail) return false;

    setIsLoading(true);

    try {
      // Solicitar permissão se necessário
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setIsLoading(false);
          return false;
        }
      }

      // Registrar service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Criar subscrição push
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        // VAPID key público - seria configurado no servidor
        applicationServerKey: urlBase64ToUint8Array(
          'BEl62iUYgUivxIkv69yViEuiBIa40HI80NObLUOkfiVw-AFbScPHu8ljjlkyS4lYHvhm5VRhZM78TWaRfhQZp4w'
        ),
      });

      // Guardar subscrição na base de dados
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_email: userEmail,
          endpoint: subscription.endpoint,
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
          user_agent: navigator.userAgent,
        });

      if (error) {
        console.error('Error saving subscription:', error);
        toast({
          title: "Erro",
          description: "Erro ao guardar subscrição",
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      setIsSubscribed(true);
      toast({
        title: "Sucesso",
        description: "Notificações push foram ativadas com sucesso",
      });
      
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Error subscribing:', error);
      toast({
        title: "Erro",
        description: "Erro ao ativar notificações push",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  }, [isSupported, userEmail, permission, requestPermission, toast]);

  // Cancelar subscrição
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !userEmail) return false;

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remover da base de dados
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_email', userEmail);

      if (error) {
        console.error('Error removing subscription:', error);
        toast({
          title: "Erro",
          description: "Erro ao remover subscrição",
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      setIsSubscribed(false);
      toast({
        title: "Sucesso",
        description: "Notificações push foram desativadas",
      });
      
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast({
        title: "Erro",
        description: "Erro ao desativar notificações push",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  }, [isSupported, userEmail, toast]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
  };
};

// Utilitários
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>;

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}