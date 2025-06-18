
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
    const { bookingId, phone, name } = await req.json();
    
    if (!bookingId || !phone || !name) {
      throw new Error("Booking ID, phone number, and name are required");
    }
    
    console.log(`Processing call initiation for booking ${bookingId}`);
    
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // Get booking details to determine plan type
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        plans!inner(key, vapi_assistant_id)
      `)
      .eq('id', bookingId)
      .single();
      
    if (bookingError || !booking) {
      throw new Error(`Failed to get booking details: ${bookingError?.message}`);
    }
    
    const planType = booking.plans.key;
    const assistantId = booking.plans.vapi_assistant_id;
    console.log(`Plan type for booking ${bookingId}: ${planType}, Assistant ID: ${assistantId}`);
    
    // Get available agent for this plan type
    const { data: availableAgent, error: agentError } = await supabaseClient
      .rpc('get_available_agent', { plan_type_param: planType });
      
    if (agentError) {
      console.error("Error getting available agent:", agentError);
      throw new Error(`Failed to get available agent: ${agentError.message}`);
    }
    
    if (!availableAgent || availableAgent.length === 0) {
      console.log(`No available agents for plan type ${planType}, queuing call`);
      
      // Add to queue
      const { error: queueError } = await supabaseClient
        .from('call_queue')
        .insert([
          {
            booking_id: bookingId,
            plan_type: planType,
            priority: planType === 'free_trial' ? 2 : 1, // Lower priority for free trials
            status: 'queued'
          }
        ]);
        
      if (queueError) {
        console.error("Error adding to queue:", queueError);
        throw new Error(`Failed to queue call: ${queueError.message}`);
      }
      
      // Update booking status
      await supabaseClient
        .from('bookings')
        .update({ status: 'queued' })
        .eq('id', bookingId);
        
      return new Response(JSON.stringify({ 
        success: true,
        queued: true,
        message: "Call queued successfully"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const agent = availableAgent[0];
    console.log(`Using agent ${agent.agent_id} from account ${agent.account_id}`);
    
    // Increment call counts
    await supabaseClient.rpc('increment_call_count', {
      agent_uuid: agent.vapi_agent_id,
      account_uuid: agent.account_id
    });
    
    // Make API request to VAPI using the assistant ID from the plan
    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agent.api_key}`,
      },
      body: JSON.stringify({
        assistantId: assistantId,
        customer: {
          number: phone,
          name: name
        }
      }),
    });

    const vapiData = await response.json();
    
    if (!response.ok) {
      console.error("VAPI API error:", vapiData);
      // Decrement call counts on error
      await supabaseClient.rpc('decrement_call_count', {
        agent_uuid: agent.vapi_agent_id,
        account_uuid: agent.account_id
      });
      throw new Error(`VAPI API error: ${vapiData.message || JSON.stringify(vapiData)}`);
    }
    
    console.log("VAPI response:", vapiData);
    
    // Record active call in database
    const { error: activeCallError } = await supabaseClient
      .from('active_calls')
      .insert([
        {
          booking_id: bookingId,
          vapi_call_id: vapiData.id || null,
          vapi_agent_id: agent.vapi_agent_id,
          vapi_account_id: agent.account_id
        }
      ]);
      
    if (activeCallError) {
      console.error("Failed to record active call:", activeCallError);
      // We'll continue despite this error as the call was already initiated
    }
    
    // Update booking status
    const { error: bookingUpdateError } = await supabaseClient
      .from('bookings')
      .update({ 
        status: 'calling',
        vapi_call_id: vapiData.id || null
      })
      .eq('id', bookingId);
      
    if (bookingUpdateError) {
      console.error("Failed to update booking status:", bookingUpdateError);
    }
    
    // Record call event
    const { error: eventError } = await supabaseClient
      .from('call_events')
      .insert([
        {
          booking_id: bookingId,
          event_type: 'call_initiated',
          details: vapiData
        }
      ]);
      
    if (eventError) {
      console.error("Failed to record call event:", eventError);
    }
    
    // Return success
    return new Response(JSON.stringify({ 
      success: true,
      call_id: vapiData.id,
      assistant_id: assistantId,
      message: "Call initiated successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error initiating VAPI call:", error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
