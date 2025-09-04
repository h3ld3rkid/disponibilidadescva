import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
}

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }

  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Error sending Telegram message:', error);
    throw new Error(`Failed to send Telegram message: ${error}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const update: TelegramUpdate = await req.json();
    console.log('Received Telegram update:', JSON.stringify(update, null, 2));

    if (!update.message) {
      console.log('No message in update, ignoring');
      return new Response('OK', { headers: corsHeaders });
    }

    const { message } = update;
    const chatId = message.chat.id;
    const text = message.text || '';
    const userName = message.from.first_name + (message.from.last_name ? ` ${message.from.last_name}` : '');

    console.log(`Received message from ${userName} (${chatId}): ${text}`);

    // Handle /start command
    if (text.startsWith('/start')) {
      const welcomeMessage = `🤖 <b>Bem-vindo ao Bot da Cruz Vermelha de Amares!</b>\n\n` +
        `Olá ${userName}! 👋\n\n` +
        `<b>O seu Chat ID é:</b> <code>${chatId}</code>\n\n` +
        `📋 <b>Como configurar notificações:</b>\n` +
        `1. Copie o Chat ID acima\n` +
        `2. Vá ao seu perfil na aplicação web\n` +
        `3. Cole o Chat ID na aba "Telegram"\n` +
        `4. Guarde as configurações\n\n` +
        `✅ Após configurar, receberá notificações quando alguém lhe solicitar uma troca de turno!\n\n` +
        `Se tiver dúvidas, contacte o administrador.`;

      await sendTelegramMessage(chatId, welcomeMessage);
      console.log(`Sent welcome message to ${userName} (${chatId})`);
    } 
    // Handle /help command
    else if (text.startsWith('/help')) {
      const helpMessage = `📚 <b>Ajuda - Bot CVAmares</b>\n\n` +
        `<b>Comandos disponíveis:</b>\n` +
        `• /start - Obter o seu Chat ID\n` +
        `• /help - Mostrar esta ajuda\n` +
        `• /id - Mostrar o seu Chat ID\n\n` +
        `<b>O seu Chat ID:</b> <code>${chatId}</code>\n\n` +
        `Para mais informações, contacte o administrador.`;

      await sendTelegramMessage(chatId, helpMessage);
      console.log(`Sent help message to ${userName} (${chatId})`);
    }
    // Handle /id command
    else if (text.startsWith('/id')) {
      const idMessage = `🆔 <b>O seu Chat ID</b>\n\n` +
        `<code>${chatId}</code>\n\n` +
        `Use este ID para configurar as notificações no seu perfil da aplicação web.`;

      await sendTelegramMessage(chatId, idMessage);
      console.log(`Sent ID message to ${userName} (${chatId})`);
    }
    // Handle unknown commands or messages
    else {
      const unknownMessage = `🤷‍♂️ Comando não reconhecido.\n\n` +
        `Use /help para ver os comandos disponíveis.\n\n` +
        `<b>O seu Chat ID:</b> <code>${chatId}</code>`;

      await sendTelegramMessage(chatId, unknownMessage);
      console.log(`Sent unknown command message to ${userName} (${chatId})`);
    }

    return new Response('OK', { headers: corsHeaders });

  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    return new Response('Internal Server Error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});