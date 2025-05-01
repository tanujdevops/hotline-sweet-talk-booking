
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
    
    // Create a Supabase client with the Supabase service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // Check current active calls count
    const { count, error: countError } = await supabaseClient
      .from('active_calls')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      throw new Error(`Failed to check active calls: ${countError.message}`);
    }
    
    // Define the maximum concurrent calls (VAPI limit)
    const MAX_CONCURRENT_CALLS = 10;
    
    // Determine if we can make a new call
    const canMakeCall = count !== null && count < MAX_CONCURRENT_CALLS;
    
    // Log for debugging
    console.log(`Active calls: ${count}, Can make call: ${canMakeCall}`);
    
    // Return the result
    return new Response(JSON.stringify({ canMakeCall, activeCallCount: count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error checking VAPI concurrency:", error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
