import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // Accept planType from frontend, but only use account concurrency
    let planType = null;
    let body = {};
    try {
      body = await req.json();
      planType = body.planType || null;
    } catch (e) {}

    // Create a Supabase client with the service role key
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Fetch the single active VAPI account
    const { data: account, error: accountError } = await supabaseClient
      .from('vapi_accounts')
      .select('id, current_active_calls, max_concurrent_calls')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (accountError || !account) {
      throw new Error(`Failed to get VAPI account: ${accountError?.message}`);
    }

    const canMakeCall = account.current_active_calls < account.max_concurrent_calls;

    // If cannot make call, get queue position (all queued calls regardless of plan type)
    let queuePosition = null;
    if (!canMakeCall) {
      const { count } = await supabaseClient
        .from('call_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued');
      queuePosition = (count || 0) + 1;
    }

    return new Response(JSON.stringify({
      canMakeCall,
      queuePosition,
      planType
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error checking VAPI concurrency:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});