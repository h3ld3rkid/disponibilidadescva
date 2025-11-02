import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    console.log('Fetching PDF from:', url)

    // Convert Google Drive preview URL to download URL if needed
    let downloadUrl = url
    if (url.includes('drive.google.com')) {
      const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
      if (fileIdMatch) {
        const fileId = fileIdMatch[1]
        downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
      }
    }

    console.log('Download URL:', downloadUrl)

    // Fetch the PDF
    const pdfResponse = await fetch(downloadUrl)

    if (!pdfResponse.ok) {
      console.error('Failed to fetch PDF:', pdfResponse.status, pdfResponse.statusText)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch PDF', status: pdfResponse.status }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: pdfResponse.status 
        }
      )
    }

    // Get the PDF content as array buffer
    const pdfBuffer = await pdfResponse.arrayBuffer()
    
    console.log('PDF fetched successfully, size:', pdfBuffer.byteLength)

    // Return the PDF with appropriate headers
    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
      status: 200,
    })

  } catch (error) {
    console.error('Error fetching PDF:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch PDF',
        message: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
