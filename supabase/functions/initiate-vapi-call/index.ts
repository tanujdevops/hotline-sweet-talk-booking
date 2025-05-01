
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
    
    // Create a Supabase client with the Supabase service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // Get VAPI API key from environment
    const VAPI_KEY = Deno.env.get("VAPI_API_KEY");
    if (!VAPI_KEY) {
      throw new Error("VAPI API key not configured");
    }

    // Get the free trial agent ID
    const VAPI_PHONE_NUMBER_ID = Deno.env.get("VAPI_PHONE_NUMBER_ID");
    if (!VAPI_PHONE_NUMBER_ID) {
      throw new Error("VAPI phone number ID not configured");
    }
    
    // Make API request to VAPI to initiate the call
    console.log(`Initiating VAPI call for booking ${bookingId} to ${phone}`);
    
    // Updated API request payload based on VAPI's current API requirements
    // Removing agent_id, customer_number, and customer_name as they're causing errors
    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_KEY}`,
      },
      body: JSON.stringify({
        phone_number_id: VAPI_PHONE_NUMBER_ID, // Using phone_number_id instead of agent_id
        to: phone, // Using 'to' instead of customer_number
        caller_name: name, // Using caller_name instead of customer_name
        // Add any other required parameters here based on VAPI's current API
      }),
    });

    const vapiData = await response.json();
    
    if (!response.ok) {
      throw new Error(`VAPI API error: ${vapiData.message || JSON.stringify(vapiData)}`);
    }
    
    console.log("VAPI response:", vapiData);
    
    // Record active call in database
    const { data: activeCallData, error: activeCallError } = await supabaseClient
      .from('active_calls')
      .insert([
        {
          booking_id: bookingId,
          vapi_call_id: vapiData.id || null,
        }
      ]);
      
    if (activeCallError) {
      console.error("Failed to record active call:", activeCallError);
      // We'll continue despite this error as the call was already initiated
    }
    
    // Update booking status
    const { error: bookingError } = await supabaseClient
      .from('bookings')
      .update({ 
        status: 'calling',
        vapi_call_id: vapiData.id || null
      })
      .eq('id', bookingId);
      
    if (bookingError) {
      console.error("Failed to update booking status:", bookingError);
      // We'll continue despite this error
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
      // We'll continue despite this error
    }
    
    // Return success
    return new Response(JSON.stringify({ 
      success: true,
      call_id: vapiData.id,
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
