
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

    // Get the request data
    const requestData = await req.json()
    const { userId } = requestData

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    console.log(`Attempting to delete user with ID: ${userId}`)

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
