<<<<<<< HEAD
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.2.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
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
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
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
        await supabaseClient.from("bookings").update({
          payment_status: "completed",
          status: "queued",
          payment_intent_id: session.payment_intent,
          payment_amount: session.amount_total || null,
        }).eq("id", bookingId);
        console.log(`Booking ${bookingId} marked as paid and queued.`);
        break;
      }
      case "payment_intent.succeeded": {
        const intent = event.data.object;
        const bookingId = intent.metadata?.booking_id;
        if (bookingId) {
          await supabaseClient.from("bookings").update({
            payment_status: "completed",
            status: "queued",
            payment_amount: intent.amount || null,
          }).eq("id", bookingId);
          console.log(`Booking ${bookingId} marked as paid and queued (from payment_intent).`);
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
=======

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

    let event;
    
    if (STRIPE_WEBHOOK_SECRET && sig) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET);
        console.log("[Stripe Webhook] Signature verified successfully");
      } catch (err) {
        console.error("[Stripe Webhook] Signature verification failed:", err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
      }
    } else {
      console.log("[Stripe Webhook] No webhook secret configured, parsing body directly");
      try {
        event = JSON.parse(body);
      } catch (parseError) {
        console.error("[Stripe Webhook] Failed to parse JSON:", parseError);
        return new Response("Invalid JSON", { status: 400 });
      }
    }

    console.log("[Stripe Webhook] Event type:", event.type);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const bookingId = session.metadata?.booking_id;
        
        console.log("[Stripe Webhook] Processing checkout.session.completed");
        console.log("[Stripe Webhook] Booking ID:", bookingId);
        
        if (!bookingId) {
          console.error("[Stripe Webhook] No booking_id in session metadata");
          return new Response("No booking_id in metadata", { status: 400 });
        }

        // Update booking status to queued - this will trigger the queue processing
        const { error: updateError } = await supabaseClient
          .from("bookings")
          .update({
            payment_status: "completed",
            status: "queued", // This change will trigger the queue via the trigger
            payment_intent_id: session.payment_intent,
            payment_amount: session.amount_total || null,
          })
          .eq("id", bookingId);

        if (updateError) {
          console.error("[Stripe Webhook] Error updating booking:", updateError);
          return new Response("Database update failed", { status: 500 });
        }

        console.log(`[Stripe Webhook] Booking ${bookingId} marked as paid and queued`);

        // Trigger queue processing immediately
        try {
          const { data: queueResult, error: queueError } = await supabaseClient.functions.invoke('process-call-queue');
          if (queueError) {
            console.error("[Stripe Webhook] Error triggering queue processing:", queueError);
          } else {
            console.log("[Stripe Webhook] Queue processing triggered:", queueResult);
          }
        } catch (queueProcessError) {
          console.error("[Stripe Webhook] Exception triggering queue:", queueProcessError);
        }

        break;
      }

      case "payment_intent.succeeded": {
        const intent = event.data.object;
        const bookingId = intent.metadata?.booking_id;
        
        console.log("[Stripe Webhook] Processing payment_intent.succeeded");
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
>>>>>>> 8c6476d1092474624099cff534646c2ee1e11d2e
