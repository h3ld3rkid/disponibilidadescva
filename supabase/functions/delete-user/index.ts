
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Set up CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authorization header to extract caller email
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No authorization header' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // Decode JWT to get caller email (JWT is base64 encoded, payload is the second part)
    const token = authHeader.replace('Bearer ', '')
    let callerEmail: string | null = null
    
    try {
      // For service role or anon key, we need to check the request body for caller info
      // But first, let's try to get the caller's identity from the token if it's a user JWT
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        callerEmail = payload.email || null
      }
    } catch (e) {
      console.log('Could not decode JWT payload, checking request body for caller email')
    }

    // Get the request data
    const requestData = await req.json()
    const { userId, callerEmail: bodyCallerEmail } = requestData

    // Use caller email from request body if not found in token
    if (!callerEmail && bodyCallerEmail) {
      callerEmail = bodyCallerEmail
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Validate that the caller is an admin
    if (!callerEmail) {
      console.log('Could not determine caller identity')
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Could not determine caller identity' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // Create admin client to check caller's role (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: callerData, error: callerError } = await supabaseAdmin
      .from('users')
      .select('role, is_admin')
      .eq('email', callerEmail)
      .single()

    if (callerError || !callerData) {
      console.log('Could not verify caller role:', callerError?.message)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Could not verify caller permissions' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // Check if caller is admin (either by role or is_admin flag)
    const isAdmin = callerData.role === 'admin' || callerData.is_admin === true
    if (!isAdmin) {
      console.log('Non-admin user attempted to delete user:', callerEmail)
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required to delete users' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      )
    }

    console.log(`Admin ${callerEmail} attempting to delete user with ID: ${userId}`)

    // First, get the user email for local storage cleanup
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()
      
    if (userError) {
      console.error('Error fetching user before deletion:', userError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Could not find user: ${userError.message}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    if (!userData) {
      console.log('User not found for ID:', userId)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User not found' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    // Delete user from the database
    console.log('Attempting to delete user from database')
    const { error: deleteError } = await supabaseClient
      .from('users')
      .delete()
      .eq('id', userId)
      
    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Failed to delete user: ${deleteError.message}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    console.log('User successfully deleted from database:', userId, 'Email:', userData.email)
    return new Response(
      JSON.stringify({
        success: true,
        message: 'User deleted successfully',
        email: userData.email 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Unexpected error in delete-user function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `An unexpected error occurred: ${error.message || 'Unknown error'}` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
