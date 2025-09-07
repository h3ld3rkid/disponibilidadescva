import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VAPID keys - em produção, estes devem ser configurados como secrets
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NObLUOkfiVw-AFbScPHu8ljjlkyS4lYHvhm5VRhZM78TWaRfhQZp4w';
const VAPID_PRIVATE_KEY = 'VtYbVp9G6NMRgio7uGHn5LC5jHjD8qS8PNTnyOb_1Js';

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
}

interface NotificationRequest {
  userEmails?: string[];  // Lista específica de emails
  isAdmin?: boolean;      // Enviar para todos os admins
  isAll?: boolean;        // Enviar para todos os utilizadores
  payload: PushPayload;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Send push notification function called');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userEmails, isAdmin, isAll, payload }: NotificationRequest = await req.json();

    console.log('Request data:', { userEmails, isAdmin, isAll, payload });

    // Validar payload
    if (!payload || !payload.title || !payload.body) {
      throw new Error('Payload inválido: title e body são obrigatórios');
    }

    // Determinar quais subscriptions buscar
    let query = supabase
      .from('push_subscriptions')
      .select('*')
      .eq('active', true);

    if (userEmails && userEmails.length > 0) {
      // Enviar para emails específicos
      query = query.in('user_email', userEmails);
    } else if (isAdmin) {
      // Enviar para admins - buscar users admin e depois suas subscriptions
      const { data: adminUsers, error: adminError } = await supabase
        .from('users')
        .select('email')
        .eq('role', 'admin')
        .eq('active', true);

      if (adminError) {
        console.error('Error fetching admin users:', adminError);
        throw adminError;
      }

      const adminEmails = adminUsers.map(user => user.email);
      if (adminEmails.length === 0) {
        console.log('No admin users found');
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Nenhum admin encontrado',
          sent: 0 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      query = query.in('user_email', adminEmails);
    }
    // Se isAll for true, não adicionar filtros (enviar para todos)

    const { data: subscriptions, error: subscriptionsError } = await query;

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError);
      throw subscriptionsError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active subscriptions found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhuma subscrição ativa encontrada',
        sent: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${subscriptions.length} active subscriptions`);

    // Enviar notificações push
    let successCount = 0;
    let failureCount = 0;

    for (const subscription of subscriptions) {
      try {
        // Preparar dados da notificação
        const notificationData = JSON.stringify(payload);

        // Preparar headers para Web Push API
        const pushHeaders = {
          'Content-Type': 'application/octet-stream',
          'TTL': '86400', // 24 hours
        };

        // Enviar notificação push
        const pushResponse = await fetch(subscription.endpoint, {
          method: 'POST',
          headers: pushHeaders,
          body: notificationData,
        });

        if (pushResponse.ok) {
          console.log(`Push notification sent successfully to ${subscription.user_email}`);
          successCount++;
        } else {
          console.error(`Failed to send push notification to ${subscription.user_email}:`, pushResponse.status, pushResponse.statusText);
          
          // Se a subscrição é inválida (410), desativar
          if (pushResponse.status === 410) {
            await supabase
              .from('push_subscriptions')
              .update({ active: false })
              .eq('id', subscription.id);
            console.log(`Deactivated invalid subscription for ${subscription.user_email}`);
          }
          
          failureCount++;
        }
      } catch (error) {
        console.error(`Error sending push notification to ${subscription.user_email}:`, error);
        failureCount++;
      }
    }

    console.log(`Push notifications summary: ${successCount} sent, ${failureCount} failed`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `${successCount} notificações enviadas com sucesso${failureCount > 0 ? `, ${failureCount} falharam` : ''}`,
      sent: successCount,
      failed: failureCount,
      total: subscriptions.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-push-notification function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});