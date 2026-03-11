import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TELEGRAM_BOT_TOKEN) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check user exists and has telegram_chat_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email, telegram_chat_id, active')
      .eq('email', normalizedEmail)
      .single();

    if (userError || !user) {
      // Don't reveal if user exists or not
      return new Response(
        JSON.stringify({ success: true, message: 'Se o email existir e tiver Telegram configurado, receberá a nova password.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user.active) {
      return new Response(
        JSON.stringify({ success: true, message: 'Se o email existir e tiver Telegram configurado, receberá a nova password.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user.telegram_chat_id) {
      return new Response(
        JSON.stringify({ success: false, noTelegram: true, message: 'Este utilizador não tem o Telegram configurado. Contacte o administrador.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: check if there was a recent reset (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentResets } = await supabase
      .from('password_reset_requests')
      .select('id')
      .eq('email', normalizedEmail)
      .gte('requested_at', fiveMinutesAgo)
      .limit(1);

    if (recentResets && recentResets.length > 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Já foi solicitado um reset recentemente. Aguarde 5 minutos.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure temporary password
    const randomBytes = new Uint8Array(6);
    crypto.getRandomValues(randomBytes);
    const randomStr = Array.from(randomBytes).map(b => b.toString(36)).join('').substring(0, 8);
    const tempPassword = 'CVA_' + randomStr + '!';

    // Hash the password using the hash-password edge function
    const hashResponse = await fetch(`${SUPABASE_URL}/functions/v1/hash-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ password: tempPassword }),
    });

    const hashData = await hashResponse.json();
    if (!hashResponse.ok || !hashData?.hash) {
      throw new Error('Erro ao gerar hash da password');
    }

    // Update user password and set needs_password_change
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashData.hash,
        needs_password_change: true,
        failed_login_attempts: 0,
        locked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('email', normalizedEmail);

    if (updateError) {
      throw new Error('Erro ao atualizar password');
    }

    // Record the reset request
    await supabase
      .from('password_reset_requests')
      .insert([{ email: normalizedEmail, fulfilled: true }]);

    // Send via Telegram
    const telegramMessage = 
      `🔐 <b>Recuperação de Password</b>\n\n` +
      `Olá ${user.name},\n\n` +
      `A sua password foi reposta.\n\n` +
      `<b>Nova password temporária:</b>\n<code>${tempPassword}</code>\n\n` +
      `⚠️ Por segurança, será obrigado a alterar esta password no primeiro login.\n\n` +
      `Se não solicitou esta alteração, contacte o administrador imediatamente.`;

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: user.telegram_chat_id,
          text: telegramMessage,
          parse_mode: 'HTML',
        }),
      }
    );

    const telegramResult = await telegramResponse.json();
    if (!telegramResponse.ok) {
      console.error('Telegram error:', telegramResult);
      // Password was already changed, so inform user
      return new Response(
        JSON.stringify({ success: false, message: 'Erro ao enviar mensagem no Telegram. Contacte o administrador.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Self-service password reset completed for user (telegram sent)');

    return new Response(
      JSON.stringify({ success: true, message: 'Nova password enviada para o seu Telegram.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in self-reset-password:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
