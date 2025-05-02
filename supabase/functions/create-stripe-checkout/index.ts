
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
      .select('*, plans(key, price_cents), users(name, phone)')
      .eq('id', bookingId)
      .single();
      
    if (bookingError || !booking) {
      throw new Error(`Error fetching booking: ${bookingError?.message || "Booking not found"}`);
    }

    console.log("Creating checkout for booking:", bookingId);
    console.log("Booking details:", booking);

    // Create a Stripe customer or find existing one
    let customerId;
    const email = `${booking.users.phone}@example.com`; // Using phone as email for Stripe customer
    
    // Try to find existing customer with this email
    const customers = await stripe.customers.list({ email, limit: 1 });
    
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
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Sweet Talk ${booking.plans.key.replace('_', ' ')} Call`,
              description: `${booking.plans.key === 'standard' ? '3' : '7'} minute sweet talk conversation`,
              images: ['https://sweetyoncall.com/logo.png'],
            },
            unit_amount: booking.plans.price_cents, // Price in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/waiting?booking_id=${booking.id}&success=true`,
      cancel_url: `${req.headers.get('origin')}/waiting?booking_id=${booking.id}&canceled=true`,
      metadata: {
        booking_id: booking.id,
      },
      // Branding options to match sweetyoncall.com - using supported parameters
      payment_intent_data: {
        description: `Sweet Talk Call - ${booking.plans.key}`,
      },
      custom_text: {
        submit: {
          message: "We'll connect you with your sweet talker right after payment is complete.",
        },
      },
    });
    
    console.log("Stripe session created:", session.id);
    console.log("Checkout URL:", session.url);
    
    // Update booking with the Stripe session ID
    await supabaseClient
      .from('bookings')
      .update({
        payment_intent_id: session.payment_intent,
        payment_status: 'pending',
      })
      .eq('id', booking.id);
      
    return new Response(JSON.stringify({ 
      success: true,
      checkout_url: session.url,
      session_id: session.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating Stripe checkout:", error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
