import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("PayGate.to webhook received:", req.method);
    console.log("PayGate.to webhook URL:", req.url);
    
    // PayGate.to sends payment confirmations via GET request with query parameters
    if (req.method !== "GET") {
      console.log("Invalid method:", req.method);
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    // Extract query parameters from URL
    const url = new URL(req.url);
    const params = url.searchParams;
    
    console.log("PayGate.to webhook parameters:", Object.fromEntries(params));

    // Get booking ID from parameters
    const bookingId = params.get('booking_id');
    const valueCoin = params.get('value_coin'); // Actual USDC amount sent by customer
    
    if (!bookingId) {
      console.log("Missing booking_id in webhook parameters");
      return new Response("Missing booking_id parameter", { status: 400, headers: corsHeaders });
    }

    console.log("Processing payment confirmation for booking:", bookingId);
    console.log("USDC amount received:", valueCoin);

    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find booking by ID
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('*, plans(key), users(name, phone, email)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found:", bookingError?.message);
      return new Response("Booking not found", { status: 404, headers: corsHeaders });
    }

    console.log("Found booking:", booking.id);

    // Update booking with payment confirmation
    const updateData: any = {
      payment_status: 'completed',
      status: 'queued', // Ready for call processing
      crypto_payment_data: {
        ...booking.crypto_payment_data,
        payment_confirmed: true,
        confirmation_time: new Date().toISOString(),
        actual_usdc_received: valueCoin,
        webhook_params: Object.fromEntries(params)
      },
      updated_at: new Date().toISOString()
    };

    // Store the actual USDC amount received if provided
    if (valueCoin) {
      updateData.crypto_amount = parseFloat(valueCoin);
    }

    // Update the booking
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update(updateData)
      .eq('id', booking.id);

    if (updateError) {
      console.error("Error updating booking:", updateError);
      return new Response("Database update failed", { status: 500, headers: corsHeaders });
    }

    console.log("Booking payment confirmed successfully:", booking.id);
    console.log("Booking status updated to 'queued' for call processing");

    // TODO: Here you could trigger call initiation
    // For now, the booking is marked as 'queued' and ready for processing

    return new Response("Payment confirmed", {
      headers: corsHeaders,
      status: 200
    });

  } catch (error) {
    console.error("PayGate.to webhook error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Internal server error"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});