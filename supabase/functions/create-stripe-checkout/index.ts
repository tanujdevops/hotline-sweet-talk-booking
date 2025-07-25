import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.2.0?target=deno";
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { bookingId } = await req.json();
    if (!bookingId) {
      throw new Error("Booking ID is required");
    }
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    // Get Stripe API key from environment
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      throw new Error("Stripe secret key not configured");
    }
    // Initialize Stripe client
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    });
    // Fetch booking details
    const { data: booking, error: bookingError } = await supabaseClient.from('bookings').select('*, plans(key, price_cents), users(name, phone, email)').eq('id', bookingId).single();
    if (bookingError || !booking) {
      throw new Error(`Error fetching booking: ${bookingError?.message || "Booking not found"}`);
    }
    console.log("Creating checkout for booking:", bookingId);
    // Validate that user has a real email address
    if (!booking.users.email || !booking.users.email.trim()) {
      throw new Error("User must have a valid email address for payment processing");
    }
    // Create a Stripe customer or find existing one
    let customerId;
    const email = booking.users.email;
    // Try to find existing customer with this email
    const customers = await stripe.customers.list({
      email,
      limit: 1
    });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email,
        name: booking.users.name,
        phone: booking.users.phone,
        metadata: {
          user_id: booking.user_id,
          booking_id: booking.id
        }
      });
      customerId = customer.id;
    }
    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: [
        'card'
      ],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Sweet Talk ${booking.plans.key.charAt(0).toUpperCase() + booking.plans.key.slice(1)} Call`,
              description: `${booking.plans.key === 'standard' ? '3' : '7'} minute sweet talk conversation`
            },
            unit_amount: booking.plans.price_cents
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/waiting/${booking.id.slice(0, 6)}?success=true`,
      cancel_url: `${req.headers.get('origin')}/waiting/${booking.id.slice(0, 6)}?canceled=true`,
      metadata: {
        booking_id: booking.id,
        business_name: 'Sweety On Call'
      },
      // Enhanced branding for sweetyoncall
      payment_intent_data: {
        description: `Sweety On Call - ${booking.plans.key} Sweet Talk Session`,
        statement_descriptor: 'SWEETYONCALL',
        metadata: {
          booking_id: booking.id,
          service: 'sweet_talk_call'
        }
      },
      custom_text: {
        submit: {
          message: "Complete your payment to start your sweet talk session! 💕"
        }
      },
      locale: 'en',
      billing_address_collection: 'auto',
      phone_number_collection: {
        enabled: true
      }
    });
    console.log("Stripe session created:", session.id);
    console.log("Checkout URL:", session.url);
    // Update booking with the Stripe session ID
    await supabaseClient.from('bookings').update({
      payment_intent_id: session.payment_intent,
      payment_status: 'pending'
    }).eq('id', booking.id);
    return new Response(JSON.stringify({
      success: true,
      checkout_url: session.url,
      session_id: session.id
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Error creating Stripe checkout:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
