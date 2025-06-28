import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.2.0?target=deno";

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
    
    console.log("Checking payment status for booking:", bookingId);
    
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // Get Stripe API key from environment
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      throw new Error("Stripe secret key not configured");
    }

    // Initialize Stripe client
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
    
    // Fetch booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('payment_intent_id, payment_status, status')
      .eq('id', bookingId)
      .single();
      
    if (bookingError || !booking) {
      throw new Error(`Error fetching booking: ${bookingError?.message || "Booking not found"}`);
    }

    console.log("Current booking status:", booking);

    // If no payment intent ID, return current status
    if (!booking.payment_intent_id) {
      return new Response(JSON.stringify({ 
        status: booking.payment_status || 'not_started',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(booking.payment_intent_id);
    console.log("Payment intent status:", paymentIntent.status);
    
    let paymentStatus = booking.payment_status;
    
    // Update booking status based on payment intent status
    if (paymentIntent.status === 'succeeded' && booking.payment_status !== 'completed') {
      paymentStatus = 'completed';
      
      // Update booking status in Supabase
      await supabaseClient
        .from('bookings')
        .update({
          payment_status: 'completed',
          status: 'queued', // Move to queued so the call can be initiated
          payment_amount: paymentIntent.amount,
        })
        .eq('id', bookingId);

      console.log("Payment completed, booking updated to queued status");
      
      // Get booking details with user info
      const { data: bookingWithUser, error: fetchError } = await supabaseClient
        .from('bookings')
        .select('*, users(name, phone, email)')
        .eq('id', bookingId)
        .single();
        
      if (bookingWithUser && bookingWithUser.users) {
        // Try to initiate VAPI call after payment with proper parameters
        try {
          console.log("Initiating VAPI call after payment completion");
          
          // First check concurrency
          const { data: concurrencyData } = await supabaseClient.functions.invoke('check-vapi-concurrency', {
            body: { bookingId }
          });
          
          if (concurrencyData?.canMakeCall === true) {
            // Initiate VAPI call if we're under concurrency limits
            await supabaseClient.functions.invoke('initiate-vapi-call', {
              body: { 
                bookingId: bookingId,
                phone: bookingWithUser.users.phone,
                name: bookingWithUser.users.name
              }
            });
          }
        } catch (vapiError) {
          console.error("Error initiating VAPI call after payment:", vapiError);
          // We don't throw here as payment was still successful
        }
      }
    }
      
    return new Response(JSON.stringify({ 
      status: paymentStatus,
      payment_intent_status: paymentIntent.status,
      payment_amount: paymentIntent.amount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error checking payment status:", error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});