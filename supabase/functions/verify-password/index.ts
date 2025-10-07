import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as bcrypt from "https://deno.land/x/bcrypt@v0.2.4/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Buscar utilizador
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('id, email, password_hash, role, name, active, needs_password_change')
      .eq('email', email)
      .eq('active', true)
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
          status: 401 
        }
      )
    }

    // Verificar se password está em hash ou texto plano
    let isValid = false
    
    if (user.password_hash.startsWith('$2')) {
      // É bcrypt hash
      isValid = await bcrypt.compare(password, user.password_hash)
    } else {
      // Ainda é texto plano (compatibilidade durante migração)
      isValid = password === user.password_hash
      
      // Se login for bem-sucedido, fazer hash da senha
      if (isValid) {
        const hash = await bcrypt.hash(password)
        await supabaseClient
          .from('users')
          .update({ password_hash: hash })
          .eq('id', user.id)
        
        console.log('Migrated plaintext password to hash for:', email)
      }
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid credentials' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
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
