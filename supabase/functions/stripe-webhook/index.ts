
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.2.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!STRIPE_SECRET_KEY) {
      console.error("Missing STRIPE_SECRET_KEY");
      return new Response("Configuration error", { status: 500 });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    const sig = req.headers.get("stripe-signature");
    const body = await req.text();
    
    console.log("[Stripe Webhook] Processing webhook...");
    console.log("[Stripe Webhook] Signature:", sig);

    let event;
    
    if (STRIPE_WEBHOOK_SECRET && sig) {
      try {
        // Verify webhook signature if secret is configured
        event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET);
        console.log("[Stripe Webhook] Signature verified successfully");
      } catch (err) {
        console.error("[Stripe Webhook] Signature verification failed:", err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
      }
    } else {
      // If no webhook secret is configured, parse the body directly
      console.log("[Stripe Webhook] No webhook secret configured, parsing body directly");
      try {
        event = JSON.parse(body);
      } catch (parseError) {
        console.error("[Stripe Webhook] Failed to parse JSON:", parseError);
        return new Response("Invalid JSON", { status: 400 });
      }
    }

    console.log("[Stripe Webhook] Event type:", event.type);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const bookingId = session.metadata?.booking_id;
        
        console.log("[Stripe Webhook] Processing checkout.session.completed");
        console.log("[Stripe Webhook] Session ID:", session.id);
        console.log("[Stripe Webhook] Booking ID:", bookingId);
        
        if (!bookingId) {
          console.error("[Stripe Webhook] No booking_id in session metadata");
          return new Response("No booking_id in metadata", { status: 400 });
        }

        // Update booking status
        const { error: updateError } = await supabaseClient
          .from("bookings")
          .update({
            payment_status: "completed",
            status: "queued",
            payment_intent_id: session.payment_intent,
            payment_amount: session.amount_total || null,
          })
          .eq("id", bookingId);

        if (updateError) {
          console.error("[Stripe Webhook] Error updating booking:", updateError);
          return new Response("Database update failed", { status: 500 });
        }

        console.log(`[Stripe Webhook] Booking ${bookingId} marked as paid and queued`);
        break;
      }

      case "payment_intent.succeeded": {
        const intent = event.data.object;
        const bookingId = intent.metadata?.booking_id;
        
        console.log("[Stripe Webhook] Processing payment_intent.succeeded");
        console.log("[Stripe Webhook] Payment Intent ID:", intent.id);
        console.log("[Stripe Webhook] Booking ID:", bookingId);
        
        if (bookingId) {
          const { error: updateError } = await supabaseClient
            .from("bookings")
            .update({
              payment_status: "completed",
              status: "queued",
              payment_amount: intent.amount || null,
            })
            .eq("id", bookingId);

          if (updateError) {
            console.error("[Stripe Webhook] Error updating booking:", updateError);
            return new Response("Database update failed", { status: 500 });
          }

          console.log(`[Stripe Webhook] Booking ${bookingId} marked as paid and queued (from payment_intent)`);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object;
        const bookingId = intent.metadata?.booking_id;
        
        console.log("[Stripe Webhook] Processing payment_intent.payment_failed");
        console.log("[Stripe Webhook] Payment Intent ID:", intent.id);
        console.log("[Stripe Webhook] Booking ID:", bookingId);
        
        if (bookingId) {
          const { error: updateError } = await supabaseClient
            .from("bookings")
            .update({
              payment_status: "failed",
              status: "payment_failed",
            })
            .eq("id", bookingId);

          if (updateError) {
            console.error("[Stripe Webhook] Error updating booking:", updateError);
            return new Response("Database update failed", { status: 500 });
          }

          console.log(`[Stripe Webhook] Booking ${bookingId} marked as payment failed`);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[Stripe Webhook] Error processing webhook:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      message: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
