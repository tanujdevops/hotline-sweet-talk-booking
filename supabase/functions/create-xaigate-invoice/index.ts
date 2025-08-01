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

    console.log("Creating XaiGate invoice for booking:", bookingId);

    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get XaiGate API key from environment
    const XAIGATE_API_KEY = Deno.env.get("XAIGATE_API_KEY");
    const XAIGATE_BASE_URL = Deno.env.get("XAIGATE_BASE_URL");
    if (!XAIGATE_API_KEY || !XAIGATE_BASE_URL) {
      throw new Error("XaiGate API credentials not configured");
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

    console.log("Creating invoice for booking:", bookingId);

    // Validate that user has a real email address
    if (!booking.users.email || !booking.users.email.trim()) {
      throw new Error("User must have a valid email address for payment processing");
    }

    // Create XaiGate invoice
    const invoicePayload = {
      amount: (booking.plans.price_cents / 100), // Convert cents to decimal (2.49, 4.99)
      currency: 'USDT', // Default to USDT as requested
      network: 'BEP20', // Default to BEP20 as requested
      customer_email: booking.users.email,
      webhook_url: `${req.headers.get('origin')?.replace('localhost:5173', 'localhost:54321')}/functions/v1/xaigate-webhook`,
      success_url: `${req.headers.get('origin')}/waiting/${booking.id.slice(0, 6)}?success=true`,
      cancel_url: `${req.headers.get('origin')}/waiting/${booking.id.slice(0, 6)}?canceled=true`,
      metadata: {
        booking_id: booking.id,
        business_name: 'Sweety On Call',
        plan_key: booking.plans.key,
        user_name: booking.users.name,
        user_phone: booking.users.phone
      }
    };

    console.log("XaiGate invoice payload:", {
      ...invoicePayload,
      webhook_url: invoicePayload.webhook_url,
      amount: invoicePayload.amount,
      currency: invoicePayload.currency
    });

    const xaigateResponse = await fetch(`${XAIGATE_BASE_URL}/v1/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAIGATE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoicePayload)
    });

    if (!xaigateResponse.ok) {
      const errorText = await xaigateResponse.text();
      console.error(`XaiGate API error: ${xaigateResponse.status} ${xaigateResponse.statusText}`, errorText);
      throw new Error(`XaiGate API error: ${xaigateResponse.status} - ${errorText}`);
    }

    const invoiceData = await xaigateResponse.json();
    console.log("XaiGate invoice created:", invoiceData.id);

    // Update booking with XaiGate invoice ID
    await supabaseClient.from('bookings').update({
      xaigate_invoice_id: invoiceData.id,
      crypto_currency: 'USDT',
      crypto_network: 'BEP20',
      payment_status: 'pending'
    }).eq('id', booking.id);

    console.log("Invoice created successfully:", invoiceData.id);
    console.log("Payment URL:", invoiceData.payment_url);

    return new Response(JSON.stringify({
      success: true,
      payment_url: invoiceData.payment_url || invoiceData.checkout_url, // Handle different response formats
      invoice_id: invoiceData.id
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });

  } catch (error) {
    console.error("Error creating XaiGate invoice:", error);
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