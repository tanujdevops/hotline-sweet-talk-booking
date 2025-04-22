
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const VAPI_KEY = 'c498bc1e-5fc2-470b-a0ac-9a7b8b06ccd3';
const FREE_TRIAL_AGENT = 'abf1e9cc-5e1f-42f8-85f5-8d452ec29746';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, phone } = await req.json();

    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_KEY}`,
      },
      body: JSON.stringify({
        agent_id: FREE_TRIAL_AGENT,
        customer_number: phone,
        customer_name: name,
      }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error initiating vAPI call:', error);
    return new Response(JSON.stringify({ error: 'Failed to initiate call' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
