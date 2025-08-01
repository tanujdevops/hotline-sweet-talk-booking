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
    
    console.log("Environment check:", {
      XAIGATE_API_KEY: XAIGATE_API_KEY ? `Present (${XAIGATE_API_KEY.substring(0, 10)}...)` : 'Missing'
    });
    
    if (!XAIGATE_API_KEY) {
      throw new Error("XaiGate API key not configured");
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

    // Create XaiGate invoice using correct API format
    const invoicePayload = {
      apiKey: XAIGATE_API_KEY,
      orderId: booking.id,
      amount: (booking.plans.price_cents / 100).toString(), // Convert to string as required
      currency: 'USD', // XaiGate expects USD, not USDT
      email: booking.users.email,
      shopName: 'Sweety On Call',
      description: `${booking.plans.key === 'standard' ? 'Essential' : 'Deluxe'} Sweet Talk Session`,
      successUrl: `${req.headers.get('origin')}/waiting/${booking.id.slice(0, 6)}?success=true`,
      failUrl: `${req.headers.get('origin')}/waiting/${booking.id.slice(0, 6)}?canceled=true`,
      notifyUrl: `${req.headers.get('origin')?.replace('localhost:5173', 'localhost:54321')}/functions/v1/xaigate-webhook`
    };

    console.log("XaiGate invoice payload:", {
      ...invoicePayload,
      apiKey: '[HIDDEN]',
      amount: invoicePayload.amount,
      currency: invoicePayload.currency
    });

    console.log("Making request to: https://wallet-api.xaigate.com/api/v1/invoice/create");
    
    const xaigateResponse = await fetch('https://wallet-api.xaigate.com/api/v1/invoice/create', {
      method: 'POST',
      headers: {
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
    console.log("XaiGate invoice created:", invoiceData.invoiceNo);

    // Update booking with XaiGate invoice ID
    await supabaseClient.from('bookings').update({
      xaigate_invoice_id: invoiceData.invoiceNo,
      crypto_currency: 'USD', // XaiGate uses USD which can be paid with crypto
      crypto_amount: parseFloat(invoiceData.amount),
      payment_status: 'pending'
    }).eq('id', booking.id);

    console.log("Invoice created successfully:", invoiceData.invoiceNo);
    console.log("Payment URL:", invoiceData.payUrl);

    return new Response(JSON.stringify({
      success: true,
      payment_url: invoiceData.payUrl, // XaiGate returns payUrl
      invoice_id: invoiceData.invoiceNo
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