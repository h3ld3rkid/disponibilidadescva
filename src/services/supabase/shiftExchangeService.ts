import { supabase } from "@/integrations/supabase/client";
import { PushNotificationService } from "@/services/pushNotificationService";

export interface ShiftExchangeRequest {
  id: string;
  requester_email: string;
  requester_name: string;
  target_email: string;
  target_name: string;
  requested_date: string;
  requested_shift: string;
  offered_date: string;
  offered_shift: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message?: string;
  created_at: string;
  updated_at: string;
  responded_at?: string;
  email_sent?: boolean;
  email_sent_at?: string;
  broadcast_id?: string;
}

export const shiftExchangeService = {
  // Criar novo pedido de troca
  async createExchangeRequest(data: {
    requester_email: string;
    requester_name: string;
    target_email: string;
    target_name: string;
    requested_date: string;
    requested_shift: string;
    offered_date: string;
    offered_shift: string;
    message?: string;
    broadcast_id?: string;
  }): Promise<{ success: boolean; data?: ShiftExchangeRequest }> {
    console.log('=== CREATING EXCHANGE REQUEST ===');
    console.log('Request data:', data);
    
    try {
      const { data: result, error } = await supabase
        .from('shift_exchange_requests')
        .insert({
          requester_email: data.requester_email,
          requester_name: data.requester_name,
          target_email: data.target_email,
          target_name: data.target_name,
          requested_date: data.requested_date,
          requested_shift: data.requested_shift,
          offered_date: data.offered_date,
          offered_shift: data.offered_shift,
          message: data.message,
          broadcast_id: data.broadcast_id
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating exchange request:', error);
        throw error;
      }
      
      console.log('Exchange request created successfully:', result);
      
      // Send email notification
      try {
        await supabase.functions.invoke('send-exchange-notification', {
          body: {
            requestId: result.id,
            requesterName: data.requester_name,
            requesterEmail: data.requester_email,
            targetName: data.target_name,
            targetEmail: data.target_email,
            requestedDate: data.requested_date,
            requestedShift: data.requested_shift,
            offeredDate: data.offered_date,
            offeredShift: data.offered_shift,
            message: data.message
          }
        });
        console.log('Email notification sent successfully');
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        // Don't fail the request if email fails
      }
      
      // Send Telegram notification
      try {
        // Get target user's telegram_chat_id
        const { data: targetUser, error: userError } = await supabase
          .from('users')
          .select('telegram_chat_id')
          .eq('email', data.target_email)
          .single();

        if (userError) {
          console.error('Error getting target user:', userError);
        } else if (targetUser?.telegram_chat_id) {
          const getShiftLabel = (shift: string) => {
            switch (shift) {
              case 'day': return 'Turno Diurno';
              case 'overnight': return 'Pernoite';
              case 'morning': return 'Turno Manhã';
              case 'afternoon': return 'Turno Tarde';
              case 'night': return 'Turno Noite';
              default: return shift;
            }
          };

          const formatDate = (dateStr: string) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('pt-PT', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            });
          };

          // Check if it's a broadcast request (no offered date)
          const isBroadcast = !data.offered_date || data.offered_date === '';
          
          let telegramMessage;
          if (isBroadcast) {
            telegramMessage = `🔄 <b>Novo Pedido de Troca de Turno</b>\n\n` +
              `<b>👤 Solicitante:</b> ${data.requester_name}\n\n` +
              `<b>📋 Detalhes da Troca:</b>\n` +
              `• <b>Necessita de troca dia:</b> ${getShiftLabel(data.requested_shift)} (${formatDate(data.requested_date)})\n` +
              (data.message ? `\n💬 <b>Mensagem:</b> ${data.message}\n` : '') +
              `\n📱 Responda através da aplicação web.`;
          } else {
            telegramMessage = `🔄 <b>Novo Pedido de Troca de Turno</b>\n\n` +
              `<b>👤 Solicitante:</b> ${data.requester_name}\n\n` +
              `<b>📋 Detalhes da Troca:</b>\n` +
              `• <b>Oferece:</b> ${getShiftLabel(data.offered_shift)} (${formatDate(data.offered_date)})\n` +
              `• <b>Pretende:</b> ${getShiftLabel(data.requested_shift)} (${formatDate(data.requested_date)})\n` +
              (data.message ? `\n💬 <b>Mensagem:</b> ${data.message}\n` : '') +
              `\n📱 Responda através da aplicação web.`;
          }

          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              chatId: targetUser.telegram_chat_id,
              message: telegramMessage
            }
          });
          console.log('Telegram notification sent successfully');
        } else {
          console.log('Target user does not have telegram_chat_id configured');
        }
      } catch (telegramError) {
        console.error('Error sending Telegram notification:', telegramError);
        // Don't fail the request if Telegram notification fails
      }
      
      return { success: true, data: result as ShiftExchangeRequest };
    } catch (error) {
      console.error('Error in createExchangeRequest:', error);
      return { success: false };
    }
  },

  // Obter pedidos de troca para um utilizador
  async getUserExchangeRequests(userEmail: string): Promise<ShiftExchangeRequest[]> {
    console.log('=== GETTING USER EXCHANGE REQUESTS ===');
    console.log('User email:', userEmail);
    
    try {
      const { data, error } = await supabase
        .from('shift_exchange_requests')
        .select('*')
        .or(`requester_email.eq.${userEmail},target_email.eq.${userEmail}`)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error getting exchange requests:', error);
        throw error;
      }
      
      console.log('Exchange requests retrieved:', data);
      return (data || []) as ShiftExchangeRequest[];
    } catch (error) {
      console.error('Error in getUserExchangeRequests:', error);
      return [];
    }
  },

  // Obter pedidos pendentes para um utilizador (como target)
  async getPendingRequestsForUser(userEmail: string): Promise<ShiftExchangeRequest[]> {
    console.log('=== GETTING PENDING REQUESTS FOR USER ===');
    console.log('User email:', userEmail);
    
    try {
      const { data, error } = await supabase
        .from('shift_exchange_requests')
        .select('*')
        .eq('target_email', userEmail)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error getting pending requests:', error);
        throw error;
      }
      
      console.log('Pending requests retrieved:', data);
      return (data || []) as ShiftExchangeRequest[];
    } catch (error) {
      console.error('Error in getPendingRequestsForUser:', error);
      return [];
    }
  },

  // Responder a um pedido de troca
  async respondToExchangeRequest(
    requestId: string, 
    status: 'accepted' | 'rejected'
  ): Promise<{ success: boolean }> {
    console.log('=== RESPONDING TO EXCHANGE REQUEST ===');
    console.log('Request ID:', requestId, 'Status:', status);
    
    try {
      // Primeiro, buscar os detalhes do pedido antes de atualizar
      const { data: requestData, error: fetchError } = await supabase
        .from('shift_exchange_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) {
        console.error('Error fetching exchange request details:', fetchError);
        throw fetchError;
      }

      // Atualizar o status do pedido
      const { error } = await supabase
        .from('shift_exchange_requests')
        .update({
          status: status,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
        
      if (error) {
        console.error('Error responding to exchange request:', error);
        throw error;
      }
      
      console.log('Exchange request response saved successfully');

      // Se aceite e faz parte de um broadcast, cancelar os outros pedidos pendentes
      if (status === 'accepted' && requestData.broadcast_id) {
        console.log('Cancelling other broadcast requests with broadcast_id:', requestData.broadcast_id);
        const { error: cancelError } = await supabase
          .from('shift_exchange_requests')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('broadcast_id', requestData.broadcast_id)
          .eq('status', 'pending')
          .neq('id', requestId);

        if (cancelError) {
          console.error('Error cancelling other broadcast requests:', cancelError);
        } else {
          console.log('Other broadcast requests cancelled successfully');
        }
      }

      // Enviar notificação push ao utilizador que fez o pedido
      try {
        await PushNotificationService.onExchangeRequestResponded(
          requestData.requester_email,
          requestData.target_name,
          status,
          requestData.requested_date,
          requestData.requested_shift
        );
        console.log('Push notification sent to requester');
      } catch (pushError) {
        console.error('Error sending push notification:', pushError);
        // Não falhar se a notificação push falhar
      }

      // Enviar notificação Telegram ao utilizador que fez o pedido
      try {
        const { data: requesterUser, error: userError } = await supabase
          .from('users')
          .select('telegram_chat_id')
          .eq('email', requestData.requester_email)
          .single();

        if (userError) {
          console.error('Error getting requester user:', userError);
        } else if (requesterUser?.telegram_chat_id) {
          const getShiftLabel = (shift: string) => {
            switch (shift) {
              case 'day': return 'Turno Diurno';
              case 'overnight': return 'Pernoite';
              case 'morning': return 'Turno Manhã';
              case 'afternoon': return 'Turno Tarde';
              case 'night': return 'Turno Noite';
              default: return shift;
            }
          };

          const formatDate = (dateStr: string) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('pt-PT', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            });
          };

          const statusText = status === 'accepted' ? '✅ <b>ACEITE</b>' : '❌ <b>RECUSADA</b>';
          const statusEmoji = status === 'accepted' ? '🎉' : '😔';
          
          const telegramMessage = `${statusEmoji} <b>Resposta ao Pedido de Troca</b>\n\n` +
            `${statusText}\n\n` +
            `<b>👤 Respondeu:</b> ${requestData.target_name}\n\n` +
            `<b>📋 Troca:</b>\n` +
            `• <b>Data:</b> ${formatDate(requestData.requested_date)}\n` +
            `• <b>Turno:</b> ${getShiftLabel(requestData.requested_shift)}\n\n` +
            (status === 'accepted' 
              ? '🎯 A troca foi aceite! Pode proceder com a alteração.' 
              : '💬 Pode tentar contactar diretamente ou fazer um novo pedido.'
            );

          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              chatId: requesterUser.telegram_chat_id,
              message: telegramMessage
            }
          });
          console.log('Telegram notification sent to requester');
        } else {
          console.log('Requester user does not have telegram_chat_id configured');
        }
      } catch (telegramError) {
        console.error('Error sending Telegram notification to requester:', telegramError);
        // Não falhar se a notificação Telegram falhar
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in respondToExchangeRequest:', error);
      return { success: false };
    }
  },

  // Cancelar um pedido de troca (pelo remetente)
  async cancelExchangeRequest(requestId: string): Promise<{ success: boolean }> {
    console.log('=== CANCELLING EXCHANGE REQUEST ===');
    console.log('Request ID:', requestId);
    
    try {
      const { error } = await supabase
        .from('shift_exchange_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
        
      if (error) {
        console.error('Error cancelling exchange request:', error);
        throw error;
      }
      
      console.log('Exchange request cancelled successfully');
      return { success: true };
    } catch (error) {
      console.error('Error in cancelExchangeRequest:', error);
      return { success: false };
    }
  },

  // Cancelar todos os pedidos de um broadcast
  async cancelBroadcastRequests(broadcastId: string): Promise<{ success: boolean }> {
    console.log('=== CANCELLING BROADCAST REQUESTS ===');
    console.log('Broadcast ID:', broadcastId);
    
    try {
      const { error } = await supabase
        .from('shift_exchange_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('broadcast_id', broadcastId)
        .eq('status', 'pending');
        
      if (error) {
        console.error('Error cancelling broadcast requests:', error);
        throw error;
      }
      
      console.log('Broadcast requests cancelled successfully');
      return { success: true };
    } catch (error) {
      console.error('Error in cancelBroadcastRequests:', error);
      return { success: false };
    }
  },

  // Configurar subscrição real-time para pedidos de troca
  setupRealtimeSubscription(userEmail: string, callback: () => void) {
    console.log('=== SETTING UP EXCHANGE REQUESTS REALTIME SUBSCRIPTION ===');
    const channel = supabase
      .channel('exchange-requests-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'shift_exchange_requests',
          filter: `target_email=eq.${userEmail}`
        }, 
        (payload) => {
          console.log('Realtime exchange request change detected:', payload);
          callback();
        })
      .subscribe();
      
    return () => {
      console.log('Removing exchange requests realtime subscription');
      supabase.removeChannel(channel);
    };
  }
};
