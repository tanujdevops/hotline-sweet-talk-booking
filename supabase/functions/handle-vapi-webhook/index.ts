
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookData = await req.json();
    console.log("Received VAPI webhook:", JSON.stringify(webhookData, null, 2));
    
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    const { message } = webhookData;
    
    if (!message || !message.call) {
      console.log("No call data in webhook");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const callId = message.call.id;
    const eventType = message.type;
    
    console.log(`Processing ${eventType} event for call ${callId}`);
    
    // Find the active call
    const { data: activeCall, error: activeCallError } = await supabaseClient
      .from('active_calls')
      .select('*')
      .eq('vapi_call_id', callId)
      .single();
    
    if (activeCallError || !activeCall) {
      console.log(`No active call found for VAPI call ${callId}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    // Record the event
    await supabaseClient
      .from('call_events')
      .insert([
        {
          booking_id: activeCall.booking_id,
          event_type: eventType,
          details: webhookData
        }
      ]);
    
    // Handle call end events
    if (eventType === 'call-ended' || eventType === 'call-failed') {
      console.log(`Call ${callId} ended, cleaning up`);
      
      // Remove from active calls
      await supabaseClient
        .from('active_calls')
        .delete()
        .eq('vapi_call_id', callId);
      
      // Decrement call counts
      if (activeCall.vapi_agent_id && activeCall.vapi_account_id) {
        await supabaseClient.rpc('decrement_call_count', {
          agent_uuid: activeCall.vapi_agent_id,
          account_uuid: activeCall.vapi_account_id
        });
      }
      
      // Update booking status
      const finalStatus = eventType === 'call-ended' ? 'completed' : 'failed';
      await supabaseClient
        .from('bookings')
        .update({ status: finalStatus })
        .eq('id', activeCall.booking_id);
      
      // Trigger queue processing to handle waiting calls
      await supabaseClient.functions.invoke('process-call-queue');
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("Error handling VAPI webhook:", error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
