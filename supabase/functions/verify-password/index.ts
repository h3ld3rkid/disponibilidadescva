import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"
import { Buffer } from "node:buffer"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const scryptAsync = promisify(scrypt)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_LOGIN_ATTEMPTS = 3

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(':')
  const keyBuffer = Buffer.from(key, 'hex')
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer
  return timingSafeEqual(keyBuffer, derivedKey)
}

async function hashPassword(password: string): Promise<string> {
  const { randomBytes } = await import("node:crypto")
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

async function sendTelegramToAdmins(supabaseClient: any, message: string) {
  try {
    // Get all admin users with telegram_chat_id
    const { data: admins, error } = await supabaseClient
      .from('users')
      .select('telegram_chat_id, name')
      .eq('role', 'admin')
      .eq('active', true)
      .not('telegram_chat_id', 'is', null)

    if (error || !admins || admins.length === 0) {
      console.log('No admins with Telegram configured found')
      return
    }

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!TELEGRAM_BOT_TOKEN) {
      console.log('TELEGRAM_BOT_TOKEN not configured')
      return
    }

    // Send message to each admin
    for (const admin of admins) {
      if (admin.telegram_chat_id) {
        try {
          const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: admin.telegram_chat_id,
                text: message,
                parse_mode: 'HTML',
              }),
            }
          )
          
          if (response.ok) {
            console.log(`Telegram notification sent to admin: ${admin.name}`)
          } else {
            console.error(`Failed to send Telegram to ${admin.name}:`, await response.text())
          }
        } catch (e) {
          console.error(`Error sending Telegram to ${admin.name}:`, e)
        }
      }
    }
  } catch (error) {
    console.error('Error sending Telegram notifications:', error)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar utilizador (incluindo inativos para verificar se está bloqueado)
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('id, email, password_hash, role, name, active, needs_password_change, failed_login_attempts, locked_at')
      .eq('email', email)
      .single()

    if (userError || !user) {
      console.log('User not found:', email)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid credentials' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Verificar se utilizador está bloqueado
    if (!user.active && user.locked_at) {
      console.log('User is locked due to failed attempts:', email)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Account locked',
          locked: true,
          message: 'A sua conta foi bloqueada devido a tentativas de login falhadas. Por favor contacte o administrador para reativar.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Verificar se utilizador está inativo (por outras razões)
    if (!user.active) {
      console.log('User is inactive:', email)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Account inactive',
          message: 'A sua conta está inativa. Por favor contacte o administrador.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Se o utilizador está ativo mas ficou com estado de bloqueio/contador antigo (ex.: desbloqueio manual), normalizar
    const currentAttempts = user.failed_login_attempts ?? 0
    if (currentAttempts >= MAX_LOGIN_ATTEMPTS || user.locked_at) {
      console.log('Normalizing lockout state for active user:', email, {
        failed_login_attempts: currentAttempts,
        locked_at: user.locked_at,
      })

      const { error: normalizeError } = await supabaseClient
        .from('users')
        .update({ failed_login_attempts: 0, locked_at: null })
        .eq('id', user.id)

      if (normalizeError) {
        console.error('Error normalizing lockout state:', normalizeError)
      }

      // manter o estado local consistente para o resto desta execução
      user.failed_login_attempts = 0
      user.locked_at = null
    }

    // Verificar se password está em hash scrypt ou texto plano
    let isValid = false
    
    if (user.password_hash.includes(':')) {
      // É scrypt hash
      isValid = await verifyPassword(password, user.password_hash)
    } else {
      // Ainda é texto plano (compatibilidade durante migração)
      isValid = password === user.password_hash
      
      // Se login for bem-sucedido, fazer hash da senha
      if (isValid) {
        const hash = await hashPassword(password)
        await supabaseClient
          .from('users')
          .update({ password_hash: hash })
          .eq('id', user.id)
        
        console.log('Migrated plaintext password to scrypt hash for:', email)
      }
    }

    if (!isValid) {
      // Incrementar contador de tentativas falhadas
      const newAttempts = (user.failed_login_attempts || 0) + 1
      console.log(`Failed login attempt ${newAttempts}/${MAX_LOGIN_ATTEMPTS} for:`, email)

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        // Bloquear utilizador
        await supabaseClient
          .from('users')
          .update({ 
            failed_login_attempts: newAttempts,
            active: false,
            locked_at: new Date().toISOString()
          })
          .eq('id', user.id)

        console.log('User locked due to too many failed attempts:', email)

        // Enviar notificação Telegram aos admins
        const telegramMessage = `🔒 <b>Utilizador Bloqueado</b>\n\n` +
          `O utilizador <b>${user.name}</b> (${user.email}) foi bloqueado automaticamente após ${MAX_LOGIN_ATTEMPTS} tentativas de login falhadas.\n\n` +
          `Por favor aceda ao painel de administração para reativar a conta se necessário.`
        
        await sendTelegramToAdmins(supabaseClient, telegramMessage)

        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Account locked',
            locked: true,
            message: 'A sua conta foi bloqueada devido a tentativas de login falhadas. Por favor contacte o administrador para reativar.'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      } else {
        // Apenas incrementar contador
        await supabaseClient
          .from('users')
          .update({ failed_login_attempts: newAttempts })
          .eq('id', user.id)

        const remainingAttempts = MAX_LOGIN_ATTEMPTS - newAttempts
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Invalid credentials',
            remainingAttempts,
            message: `Credenciais inválidas. Restam ${remainingAttempts} tentativa(s).`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }
    }

    // Login bem-sucedido - resetar contador de tentativas e limpar lock timestamp
    if ((user.failed_login_attempts ?? 0) > 0 || user.locked_at) {
      const { error: resetError } = await supabaseClient
        .from('users')
        .update({ failed_login_attempts: 0, locked_at: null })
        .eq('id', user.id)

      if (resetError) {
        console.error('Error resetting failed_login_attempts after successful login:', resetError)
      }
    }

    console.log('Login successful for:', email)

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          email: user.email,
          role: user.role,
          name: user.name,
          needsPasswordChange: user.needs_password_change
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error verifying password:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Authentication failed',
        message: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})