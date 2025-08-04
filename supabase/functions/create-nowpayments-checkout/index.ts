import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
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

    console.log("Creating NOWPayments checkout for booking:", bookingId);

    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get NOWPayments API key from environment
    const NOWPAYMENTS_API_KEY = Deno.env.get("NOWPAYMENTS_API_KEY");
    if (!NOWPAYMENTS_API_KEY) {
      throw new Error("NOWPayments API key not configured");
    }

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('*, plans(key, price_cents), users(name, phone, email)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Error fetching booking: ${bookingError?.message || "Booking not found"}`);
    }

    console.log("Creating NOWPayments checkout for booking:", bookingId);

    // Validate that user has a real email address
    if (!booking.users.email || !booking.users.email.trim()) {
      throw new Error("User must have a valid email address for payment processing");
    }

    // Calculate price in USD
    const priceAmount = (booking.plans.price_cents / 100).toFixed(2);
    
    // Frontend origin (where user should return)
    const frontendOrigin = req.headers.get('origin') || 'https://sweetyoncall.com';
    
    // Backend origin (where webhook should hit)  
    const backendOrigin = Deno.env.get("SUPABASE_URL") || 'http://localhost:54321';
    
    // URLs for success/cancel (exact same format as original Stripe flow)
    const shortId = booking.id.slice(0, 6);
    const successUrl = `${frontendOrigin}/waiting/${shortId}?success=true`;
    const cancelUrl = `${frontendOrigin}/waiting/${shortId}?canceled=true`;
    const ipnCallbackUrl = `${backendOrigin}/functions/v1/nowpayments-webhook`;
    
    console.log("NOWPayments URLs:", {
      success: successUrl,
      cancel: cancelUrl,
      ipn: ipnCallbackUrl
    });
    
    // Create NOWPayments invoice (similar to Stripe checkout)
    const invoicePayload = {
      price_amount: parseFloat(priceAmount),
      price_currency: "usd",
      // No pay_currency specified - NOWPayments will show all available crypto options
      // This allows users to choose cheap networks like USDT/USDC on TRON, Polygon, BSC
      order_id: booking.id,
      order_description: `Sweet Talk ${booking.plans.key.charAt(0).toUpperCase() + booking.plans.key.slice(1)} Call`,
      ipn_callback_url: ipnCallbackUrl,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: booking.users.email
    };

    console.log("Creating NOWPayments invoice:", {
      ...invoicePayload,
      customer_email: '[ENCRYPTED]'
    });

    const invoiceResponse = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': NOWPAYMENTS_API_KEY
      },
      body: JSON.stringify(invoicePayload)
    });

    console.log(`NOWPayments invoice response status: ${invoiceResponse.status}`);
    
    if (!invoiceResponse.ok) {
      const errorText = await invoiceResponse.text();
      console.error(`NOWPayments invoice error:`, errorText);
      throw new Error(`NOWPayments invoice creation failed: ${invoiceResponse.status} - ${errorText}`);
    }

    const invoiceData = await invoiceResponse.json();
    console.log("NOWPayments invoice created:", {
      id: invoiceData.id,
      invoice_url: invoiceData.invoice_url ? 'Present' : 'Missing',
      order_id: invoiceData.order_id
    });

    // Update booking with NOWPayments details
    await supabaseClient.from('bookings').update({
      nowpayments_invoice_id: invoiceData.id,
      payment_status: 'pending'
    }).eq('id', booking.id);

    console.log("NOWPayments checkout created successfully:", invoiceData.invoice_url);

    return new Response(JSON.stringify({
      success: true,
      checkout_url: invoiceData.invoice_url, // Same property name as Stripe for frontend compatibility
      invoice_url: invoiceData.invoice_url,   // Alternative property name
      invoice_id: invoiceData.id
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });

  } catch (error) {
    console.error("Error creating NOWPayments checkout:", error);
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