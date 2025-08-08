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

    console.log("Creating Blockonomics payment for booking:", bookingId);

    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get Blockonomics API key from environment
    const BLOCKONOMICS_API_KEY = Deno.env.get("BLOCKONOMICS_API_KEY");
    if (!BLOCKONOMICS_API_KEY) {
      throw new Error("Blockonomics API key not configured");
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

    console.log("Creating Blockonomics payment for booking:", bookingId);

    // Validate that user has a real email address
    if (!booking.users.email || !booking.users.email.trim()) {
      throw new Error("User must have a valid email address for payment processing");
    }

    // Calculate price in USD
    const priceUsd = booking.plans.price_cents / 100;
    console.log("USD price:", priceUsd);

    // Get current Bitcoin price from Blockonomics
    console.log("Fetching Bitcoin price from Blockonomics...");
    const priceResponse = await fetch('https://www.blockonomics.co/api/price?currency=USD', {
      headers: {
        'Authorization': `Bearer ${BLOCKONOMICS_API_KEY}`
      }
    });

    if (!priceResponse.ok) {
      const errorText = await priceResponse.text();
      console.error("Blockonomics price API error:", errorText);
      throw new Error(`Failed to get Bitcoin price: ${priceResponse.status} - ${errorText}`);
    }

    const priceData = await priceResponse.json();
    const btcPriceUsd = priceData.price;
    console.log("Current BTC price (USD):", btcPriceUsd);

    // Calculate Bitcoin amount needed (with small buffer for price fluctuation)
    const btcAmount = (priceUsd / btcPriceUsd) * 1.01; // 1% buffer
    const btcAmountSatoshis = Math.ceil(btcAmount * 100000000); // Convert to satoshis
    console.log("BTC amount needed:", btcAmount, "BTC (", btcAmountSatoshis, "satoshis)");

    // Generate new Bitcoin address
    console.log("Generating new Bitcoin address...");
    const addressResponse = await fetch('https://www.blockonomics.co/api/new_address', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BLOCKONOMICS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!addressResponse.ok) {
      const errorText = await addressResponse.text();
      console.error("Blockonomics address API error:", errorText);
      throw new Error(`Failed to generate Bitcoin address: ${addressResponse.status} - ${errorText}`);
    }

    const addressData = await addressResponse.json();
    const bitcoinAddress = addressData.address;
    console.log("Generated Bitcoin address:", bitcoinAddress);

    if (!bitcoinAddress) {
      throw new Error("No Bitcoin address returned from Blockonomics");
    }

    // Update booking with Blockonomics details
    const updateData = {
      blockonomics_address: bitcoinAddress,
      bitcoin_amount: btcAmount,
      bitcoin_price_usd: btcPriceUsd,
      payment_status: 'pending'
    };

    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update(updateData)
      .eq('id', booking.id);

    if (updateError) {
      console.error("Error updating booking:", updateError);
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }

    console.log("Blockonomics payment created successfully");

    // Generate QR code data for the payment
    const qrCodeData = `bitcoin:${bitcoinAddress}?amount=${btcAmount}&label=SweetyOnCall%20Payment`;

    return new Response(JSON.stringify({
      success: true,
      bitcoin_address: bitcoinAddress,
      bitcoin_amount: btcAmount,
      bitcoin_amount_satoshis: btcAmountSatoshis,
      usd_amount: priceUsd,
      btc_price_usd: btcPriceUsd,
      qr_code_data: qrCodeData,
      payment_window_minutes: 20, // Give user 20 minutes to pay
      booking_id: booking.id
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });

  } catch (error) {
    console.error("Error creating Blockonomics payment:", error);
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