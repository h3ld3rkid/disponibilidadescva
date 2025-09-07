import { supabase } from '@/integrations/supabase/client';

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export interface NotificationTarget {
  userEmails?: string[];  // Lista específica de emails
  isAdmin?: boolean;      // Enviar para todos os admins
  isAll?: boolean;        // Enviar para todos os utilizadores
}

/**
 * Envia notificação push para utilizadores específicos
 */
export const sendPushNotification = async (
  payload: PushNotificationPayload, 
  target: NotificationTarget = { isAdmin: true }
): Promise<{ success: boolean; message?: string }> => {
  try {
    console.log('Sending push notification:', { payload, target });
    
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        ...target,
        payload
      }
    });

    if (error) {
      console.error('Error sending push notification:', error);
      return { success: false, message: error.message };
    }

    console.log('Push notification result:', data);
    return { success: true, message: data?.message };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
};

/**
 * Notificações específicas para diferentes eventos
 */
export const pushNotifications = {
  // Notificar admins sobre nova escala submetida
  newScheduleSubmitted: (userName: string, month: string) =>
    sendPushNotification(
      {
        title: 'Nova Escala Submetida',
        body: `${userName} submeteu a escala para ${month}`,
        url: '/dashboard/user-schedules',
        tag: 'schedule-submission'
      },
      { isAdmin: true }
    ),

  // Notificar utilizador sobre pedido de troca aceite/rejeitado
  exchangeRequestResponse: (userEmail: string, requesterName: string, status: 'accepted' | 'rejected', date: string, shift: string) =>
    sendPushNotification(
      {
        title: status === 'accepted' ? 'Troca Aceite' : 'Troca Rejeitada',
        body: status === 'accepted' 
          ? `${requesterName} aceitou a sua proposta de troca para ${date} (${shift})`
          : `${requesterName} rejeitou a sua proposta de troca para ${date} (${shift})`,
        url: '/dashboard/exchanges',
        tag: 'exchange-response'
      },
      { userEmails: [userEmail] }
    ),

  // Notificar utilizador sobre novo pedido de troca
  newExchangeRequest: (targetEmail: string, requesterName: string, date: string, shift: string) =>
    sendPushNotification(
      {
        title: 'Novo Pedido de Troca',
        body: `${requesterName} quer trocar o turno de ${date} (${shift})`,
        url: '/dashboard/exchanges',
        tag: 'exchange-request',
        requireInteraction: true
      },
      { userEmails: [targetEmail] }
    ),

  // Notificar sobre nova escala publicada
  schedulePublished: (month: string) =>
    sendPushNotification(
      {
        title: 'Nova Escala Publicada',
        body: `A escala para ${month} foi publicada`,
        url: '/dashboard/current-schedule',
        tag: 'schedule-published'
      },
      { isAll: true }
    ),

  // Notificar sobre novo anúncio
  newAnnouncement: (title: string) =>
    sendPushNotification(
      {
        title: 'Novo Anúncio',
        body: title,
        url: '/dashboard',
        tag: 'announcement'
      },
      { isAll: true }
    ),

  // Lembrete de deadline para submissão de escalas
  scheduleDeadlineReminder: () =>
    sendPushNotification(
      {
        title: 'Lembrete de Escala',
        body: 'Não se esqueça de submeter a sua disponibilidade',
        url: '/dashboard/schedule',
        tag: 'deadline-reminder'
      },
      { isAll: true }
    )
};