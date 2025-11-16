import { pushNotifications } from '@/components/push/PushNotificationTrigger';

/**
 * Serviço para integrar notificações push com eventos do sistema
 */
export class PushNotificationService {
  
  /**
   * Notificar quando um utilizador submete uma nova escala
   */
  static async onScheduleSubmitted(userName: string, userEmail: string, month: string) {
    try {
      await pushNotifications.newScheduleSubmitted(userName, month);
      console.log(`Push notification sent for new schedule from ${userName}`);
    } catch (error) {
      console.error('Error sending schedule submission notification:', error);
    }
  }

  /**
   * Notificar quando uma escala é atualizada
   */
  static async onScheduleUpdated(userName: string, userEmail: string, month: string) {
    try {
      await pushNotifications.newScheduleSubmitted(userName, month);
      console.log(`Push notification sent for schedule update from ${userName}`);
    } catch (error) {
      console.error('Error sending schedule update notification:', error);
    }
  }

  /**
   * Notificar quando um pedido de troca é criado
   */
  static async onExchangeRequestCreated(
    targetEmail: string,
    requesterName: string,
    requestedDate: string,
    requestedShift: string
  ) {
    try {
      await pushNotifications.newExchangeRequest(
        targetEmail,
        requesterName,
        requestedDate,
        requestedShift
      );
      console.log(`Push notification sent for exchange request to ${targetEmail}`);
    } catch (error) {
      console.error('Error sending exchange request notification:', error);
    }
  }

  /**
   * Notificar quando um pedido de troca é respondido
   */
  static async onExchangeRequestResponded(
    requesterEmail: string,
    responderName: string,
    status: 'accepted' | 'rejected',
    requestedDate: string,
    requestedShift: string
  ) {
    try {
      await pushNotifications.exchangeRequestResponse(
        requesterEmail,
        responderName,
        status,
        requestedDate,
        requestedShift
      );
      console.log(`Push notification sent for exchange response to ${requesterEmail}`);
    } catch (error) {
      console.error('Error sending exchange response notification:', error);
    }
  }

  /**
   * Notificar quando uma nova escala oficial é publicada
   */
  static async onSchedulePublished(month: string) {
    try {
      await pushNotifications.schedulePublished(month);
      console.log(`Push notification sent for schedule published: ${month}`);
    } catch (error) {
      console.error('Error sending schedule published notification:', error);
    }
  }

  /**
   * Notificar sobre novo anúncio
   */
  static async onAnnouncementCreated(title: string) {
    try {
      await pushNotifications.newAnnouncement(title);
      console.log(`Push notification sent for new announcement: ${title}`);
    } catch (error) {
      console.error('Error sending announcement notification:', error);
    }
  }

  /**
   * Enviar lembretes de deadline
   */
  static async sendDeadlineReminder() {
    try {
      await pushNotifications.scheduleDeadlineReminder();
      console.log('Push notification sent for deadline reminder');
    } catch (error) {
      console.error('Error sending deadline reminder:', error);
    }
  }

  /**
   * Notificar utilizador sobre submissão bem-sucedida
   */
  static async onUserScheduleSubmitted(userEmail: string, month: string, editCount: number) {
    try {
      await pushNotifications.userScheduleSubmitted(userEmail, month, editCount);
      console.log(`Push notification sent to user ${userEmail} for schedule submission`);
    } catch (error) {
      console.error('Error sending user schedule submission notification:', error);
    }
  }
}