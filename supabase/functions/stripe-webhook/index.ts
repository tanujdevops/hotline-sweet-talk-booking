import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.2.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Stripe secret key and webhook secret from environment
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
  throw new Error("Stripe secret key or webhook secret not configured");
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let event;
  let rawBody;
  try {
    const sig = req.headers.get("stripe-signature");
    rawBody = await req.text();
    console.log("[Stripe Webhook Debug] Raw body length:", rawBody.length);
    console.log("[Stripe Webhook Debug] Stripe-Signature:", sig);
    
    if (!sig) {
      throw new Error("Missing Stripe signature");
    }
    
    // Construct the event using the raw body string (not parsed JSON)
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, STRIPE_WEBHOOK_SECRET);
    console.log("[Stripe Webhook Debug] Event constructed successfully:", event.type);
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    console.error("Raw body sample:", rawBody?.substring(0, 200));
    return new Response(`Webhook Error: ${err.message}`, { 
      status: 400,
      headers: corsHeaders 
    });
  }

  // Create Supabase client
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const bookingId = session.metadata?.booking_id;
        if (!bookingId) {
          throw new Error("No booking_id in session metadata");
        }
        
        // Mark payment as completed and queue the booking
        const { error: updateError } = await supabaseClient.from("bookings").update({
          payment_status: "completed",
          status: "queued",
          payment_intent_id: session.payment_intent,
          payment_amount: session.amount_total || null,
        }).eq("id", bookingId);
        
        if (updateError) {
          console.error(`Error updating booking ${bookingId}:`, updateError);
          throw updateError;
        }
        
        console.log(`Booking ${bookingId} marked as paid and queued.`);
        
        // Immediately try to process this booking with proper user data
        try {
          // Get booking details with user info
          const { data: bookingWithUser, error: fetchError } = await supabaseClient
            .from('bookings')
            .select('*, users(name, phone, email)')
            .eq('id', bookingId)
            .single();
            
          if (fetchError || !bookingWithUser || !bookingWithUser.users) {
            console.error(`Error fetching booking details for ${bookingId}:`, fetchError);
            throw new Error("Failed to fetch booking details");
          }
          
          const { error: processError } = await supabaseClient.functions.invoke('initiate-vapi-call', {
            body: { 
              bookingId: bookingId,
              phone: bookingWithUser.users.phone,
              name: bookingWithUser.users.name
            }
          });
          
          if (processError) {
            console.error(`Error initiating call for booking ${bookingId}:`, processError);
            // Don't throw here - the booking is still valid, we can retry later
          } else {
            console.log(`Successfully initiated call for booking ${bookingId}`);
          }
        } catch (initiateError) {
          console.error(`Failed to initiate call for booking ${bookingId}:`, initiateError);
          // Don't throw - the payment was successful, we can retry the call later
        }
        break;
      }
      case "payment_intent.succeeded": {
        const intent = event.data.object;
        const bookingId = intent.metadata?.booking_id;
        if (bookingId) {
          const { error: updateError } = await supabaseClient.from("bookings").update({
            payment_status: "completed",
            status: "queued",
            payment_amount: intent.amount || null,
          }).eq("id", bookingId);
          
          if (updateError) {
            console.error(`Error updating booking ${bookingId}:`, updateError);
            throw updateError;
          }
          
          console.log(`Booking ${bookingId} marked as paid and queued (from payment_intent).`);
          
          // Immediately try to process this booking with proper user data
          try {
            // Get booking details with user info
            const { data: bookingWithUser, error: fetchError } = await supabaseClient
              .from('bookings')
              .select('*, users(name, phone, email)')
              .eq('id', bookingId)
              .single();
              
            if (fetchError || !bookingWithUser || !bookingWithUser.users) {
              console.error(`Error fetching booking details for ${bookingId}:`, fetchError);
              throw new Error("Failed to fetch booking details");
            }
            
            const { error: processError } = await supabaseClient.functions.invoke('initiate-vapi-call', {
              body: { 
                bookingId: bookingId,
                phone: bookingWithUser.users.phone,
                name: bookingWithUser.users.name
              }
            });
            
            if (processError) {
              console.error(`Error initiating call for booking ${bookingId}:`, processError);
            } else {
              console.log(`Successfully initiated call for booking ${bookingId}`);
            }
          } catch (initiateError) {
            console.error(`Failed to initiate call for booking ${bookingId}:`, initiateError);
          }
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object;
        const bookingId = intent.metadata?.booking_id;
        if (bookingId) {
          await supabaseClient.from("bookings").update({
            payment_status: "failed",
            status: "payment_failed",
          }).eq("id", bookingId);
          console.log(`Booking ${bookingId} marked as payment failed.`);
        }
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Error handling Stripe webhook event:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});