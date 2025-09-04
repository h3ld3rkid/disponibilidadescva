import { supabase } from "@/integrations/supabase/client";

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
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  created_at: string;
  updated_at: string;
  responded_at?: string;
  email_sent?: boolean;
  email_sent_at?: string;
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
          message: data.message
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
          const telegramMessage = `🔄 <b>Nova Solicitação de Troca</b>\n\n` +
            `<b>De:</b> ${data.requester_name}\n` +
            `<b>Quer trocar:</b> ${data.offered_shift} (${data.offered_date})\n` +
            `<b>Por:</b> ${data.requested_shift} (${data.requested_date})\n` +
            (data.message ? `\n<b>Mensagem:</b> ${data.message}\n` : '') +
            `\nResponda através da aplicação web.`;

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
      return { success: true };
    } catch (error) {
      console.error('Error in respondToExchangeRequest:', error);
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
