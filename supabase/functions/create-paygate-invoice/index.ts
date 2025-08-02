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

    console.log("Creating PayGate.to payment for booking:", bookingId);

    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get USDC Polygon wallet address from environment
    const USDC_WALLET_ADDRESS = Deno.env.get("USDC_WALLET_ADDRESS");
    
    console.log("Environment check:", {
      USDC_WALLET_ADDRESS: USDC_WALLET_ADDRESS ? `Present (${USDC_WALLET_ADDRESS.substring(0, 10)}...)` : 'Missing'
    });
    
    if (!USDC_WALLET_ADDRESS) {
      throw new Error("USDC wallet address not configured");
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

    console.log("Creating PayGate.to payment for booking:", bookingId);

    // Validate that user has a real email address
    if (!booking.users.email || !booking.users.email.trim()) {
      throw new Error("User must have a valid email address for payment processing");
    }

    // Step 1: Create wallet with PayGate.to
    // Frontend origin (where user should return)
    const frontendOrigin = req.headers.get('origin') || 'https://sweetyoncall.com';
    
    // Backend origin (where webhook should hit)  
    const backendOrigin = Deno.env.get("SUPABASE_URL") || 'http://localhost:54321';
    
    const callbackUrl = `${backendOrigin}/functions/v1/paygate-webhook?booking_id=${booking.id}`;
    const returnUrl = `${frontendOrigin}/waiting/${booking.id.slice(0, 6)}?success=true`;
    const encodedCallback = encodeURIComponent(callbackUrl);
    
    console.log("Step 1: Creating wallet with callback URL:", callbackUrl);
    console.log("Return URL for user:", returnUrl);
    
    const walletUrl = `https://api.paygate.to/control/wallet.php?address=${USDC_WALLET_ADDRESS}&callback=${encodedCallback}`;
    
    const walletResponse = await fetch(walletUrl);
    console.log(`PayGate.to wallet response status: ${walletResponse.status}`);
    
    if (!walletResponse.ok) {
      const errorText = await walletResponse.text();
      console.error(`PayGate.to wallet error:`, errorText);
      throw new Error(`PayGate.to wallet creation failed: ${walletResponse.status} - ${errorText}`);
    }

    const walletData = await walletResponse.json();
    console.log("PayGate.to wallet created:", {
      address_in: walletData.address_in ? '[ENCRYPTED]' : 'Missing',
      polygon_address_in: walletData.polygon_address_in,
      callback_url: walletData.callback_url,
      ipn_token: walletData.ipn_token
    });

    // Step 2: Create payment URL
    const amount = (booking.plans.price_cents / 100).toFixed(2);
    const encodedEmail = encodeURIComponent(booking.users.email);
    
    // Create multiple payment URLs for different provider types
    const encodedReturnUrl = encodeURIComponent(returnUrl);
    const baseParams = `address=${walletData.address_in}&amount=${amount}&email=${encodedEmail}&currency=USD&return_url=${encodedReturnUrl}`;
    
    const paymentUrls = {
      multi: `https://checkout.paygate.to/pay.php?${baseParams}`, // All available providers
      crypto: `https://checkout.paygate.to/process-payment.php?${baseParams}&provider=simpleswap`, // Crypto-only
      fiat: `https://checkout.paygate.to/process-payment.php?${baseParams}&provider=rampnetwork` // Fiat (card/bank)
    };
    
    // Use multi-provider for now, but return all options
    const paymentUrl = paymentUrls.multi;
    
    console.log("Step 2: Payment URL generated with amount:", amount);

    // Update booking with PayGate.to details
    await supabaseClient.from('bookings').update({
      xaigate_invoice_id: walletData.ipn_token, // Store IPN token for tracking
      crypto_currency: 'USDC',
      crypto_network: 'Polygon',
      crypto_amount: parseFloat(amount),
      crypto_payment_data: {
        address_in: walletData.address_in,
        polygon_address_in: walletData.polygon_address_in,
        callback_url: walletData.callback_url,
        ipn_token: walletData.ipn_token
      },
      payment_status: 'pending'
    }).eq('id', booking.id);

    console.log("Payment URL created successfully:", paymentUrl);

    return new Response(JSON.stringify({
      success: true,
      payment_url: paymentUrl,
      payment_urls: paymentUrls, // All payment options
      invoice_id: walletData.ipn_token
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });

  } catch (error) {
    console.error("Error creating PayGate.to payment:", error);
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