
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  requestId: string;
  requesterName: string;
  requesterEmail: string;
  targetName: string;
  targetEmail: string;
  requestedDate: string;
  requestedShift: string;
  offeredDate: string;
  offeredShift: string;
  message?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== SEND EXCHANGE NOTIFICATION FUNCTION START ===');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: NotificationRequest = await req.json();
    console.log('Request data received:', requestData);

    const {
      requestId,
      requesterName,
      requesterEmail,
      targetName,
      targetEmail,
      requestedDate,
      requestedShift,
      offeredDate,
      offeredShift,
      message
    } = requestData;

    // Check if RESEND_API_KEY is available
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not found in environment variables');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Email service not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const resend = new Resend(resendApiKey);

    // Get app settings
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['email_notifications_enabled', 'smtp_from_email', 'app_name']);

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
    }

    const settingsMap = settings?.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>) || {};

    console.log('System settings:', settingsMap);

    // Check if email notifications are enabled (default to true if not set)
    const emailNotificationsEnabled = settingsMap.email_notifications_enabled !== 'false';
    if (!emailNotificationsEnabled) {
      console.log('Email notifications are disabled in system settings');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Email notifications disabled' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1>${settingsMap.app_name || 'Cruz Vermelha Amares'}</h1>
          <h2>Novo Pedido de Troca de Turno</h2>
        </div>
        
        <div style="padding: 20px; background: #f9fafb;">
          <p>Olá <strong>${targetName}</strong>,</p>
          
          <p>Recebeu um novo pedido de troca de turno de <strong>${requesterName}</strong>.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin-top: 0; color: #dc2626;">Detalhes da Troca:</h3>
            <p><strong>O que ${requesterName} pretende:</strong><br>
            ${getShiftLabel(requestedShift)} em ${formatDate(requestedDate)}</p>
            
            <p><strong>O que ${requesterName} oferece:</strong><br>
            ${getShiftLabel(offeredShift)} em ${formatDate(offeredDate)}</p>
            
            ${message ? `<p><strong>Mensagem:</strong><br>${message}</p>` : ''}
          </div>
          
          <p>Para responder a este pedido, aceda à aplicação na secção "Trocas".</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="https://escalas.cruzvermelha-amares.pt/dashboard/exchanges" 
               style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Ver Pedidos de Troca
            </a>
          </div>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="font-size: 12px; color: #6b7280;">
            Este email foi enviado automaticamente pelo sistema de escalas da ${settingsMap.app_name || 'Cruz Vermelha Amares'}.<br>
            Se não esperava receber este email, pode ignorá-lo com segurança.
          </p>
        </div>
      </div>
    `;

    const fromEmail = settingsMap.smtp_from_email || 'noreply@cruzvermelha-amares.pt';
    console.log('Sending email to:', targetEmail);
    console.log('From email:', fromEmail);

    try {
      const { data: emailResult, error: emailError } = await resend.emails.send({
        from: fromEmail,
        to: [targetEmail],
        subject: `Novo pedido de troca de turno - ${settingsMap.app_name || 'Cruz Vermelha Amares'}`,
        html: emailContent,
      });

      if (emailError) {
        console.error('Resend API error:', emailError);
        throw emailError;
      }

      console.log('Email sent successfully:', emailResult);

      // Mark email as sent
      const { error: updateError } = await supabase
        .from('shift_exchange_requests')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error updating email sent status:', updateError);
        // Don't fail the entire operation for this
      }

      console.log('Exchange notification email sent successfully to:', targetEmail);

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Email sent successfully' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (emailError) {
      console.error('Error sending email via Resend:', emailError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Email sending failed: ${emailError.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error in send-exchange-notification function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
