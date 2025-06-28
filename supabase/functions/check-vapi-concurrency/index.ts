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
    const { bookingId } = await req.json();
    
    if (!bookingId) {
      throw new Error("Booking ID is required");
    }
    
    console.log(`Checking concurrency for booking ${bookingId}`);
    
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
        plans!inner(key)
      `)
      .eq('id', bookingId)
      .single();
      
    if (bookingError || !booking) {
      throw new Error(`Failed to get booking details: ${bookingError?.message}`);
    }
    
    const planType = booking.plans.key;
    console.log(`Checking availability for plan type: ${planType}`);
    
    // Check if there's an available agent for this plan type
    // Use the RPC function instead of direct SQL to avoid column ambiguity
    try {
      const { data: availableAgent, error: agentError } = await supabaseClient
        .rpc('test_agent_availability_safe');
        
      if (agentError) {
        console.error("Error checking agent availability:", agentError);
        throw new Error(`Failed to check agent availability: ${agentError.message}`);
      }
      
      // Find the entry for our plan type
      const planEntry = availableAgent?.find(entry => entry.plan_type === planType);
      const canMakeCall = planEntry && planEntry.agent_count > 0;
      
      // Get queue position if call cannot be made immediately
      let queuePosition = null;
      if (!canMakeCall) {
        const { count } = await supabaseClient
          .from('call_queue')
          .select('*', { count: 'exact', head: true })
          .eq('plan_type', planType)
          .eq('status', 'queued');
          
        queuePosition = (count || 0) + 1;
      }
      
      console.log(`Can make call: ${canMakeCall}, Queue position: ${queuePosition}`);
      
      // Return the result
      return new Response(JSON.stringify({ 
        canMakeCall,
        queuePosition,
        planType
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (error) {
      console.error("Error checking agent availability:", error);
      
      // Fallback to a simpler check that doesn't use the problematic function
      const { data: agentCount } = await supabaseClient
        .from('vapi_agents')
        .select('id', { count: 'exact' })
        .eq('agent_type', planType)
        .eq('is_active', true)
        .lt('current_active_calls', 'max_concurrent_calls');
        
      const canMakeCall = (agentCount || 0) > 0;
      
      // Get queue position if call cannot be made immediately
      let queuePosition = null;
      if (!canMakeCall) {
        const { count } = await supabaseClient
          .from('call_queue')
          .select('*', { count: 'exact', head: true })
          .eq('plan_type', planType)
          .eq('status', 'queued');
          
        queuePosition = (count || 0) + 1;
      }
      
      return new Response(JSON.stringify({ 
        canMakeCall,
        queuePosition,
        planType,
        fallback: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    console.error("Error checking VAPI concurrency:", error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});