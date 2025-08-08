import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Blockonomics webhook received:", req.method);
    console.log("Blockonomics webhook URL:", req.url);
    
    // Blockonomics sends payment confirmations via GET or POST request
    if (!["GET", "POST"].includes(req.method)) {
      console.log("Invalid method:", req.method);
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    let params: URLSearchParams;
    
    if (req.method === "GET") {
      // Extract query parameters from URL for GET requests
      const url = new URL(req.url);
      params = url.searchParams;
    } else {
      // For POST requests, try to parse form data or JSON
      const contentType = req.headers.get("content-type") || "";
      
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const body = await req.text();
        params = new URLSearchParams(body);
      } else if (contentType.includes("application/json")) {
        const jsonBody = await req.json();
        params = new URLSearchParams();
        // Convert JSON to URLSearchParams
        Object.entries(jsonBody).forEach(([key, value]) => {
          params.set(key, String(value));
        });
      } else {
        // Try to parse as form data
        const body = await req.text();
        params = new URLSearchParams(body);
      }
    }
    
    console.log("Blockonomics webhook parameters:", Object.fromEntries(params));

    // Extract payment data from webhook
    const address = params.get('addr') || params.get('address');
    const status = params.get('status');
    const value = params.get('value'); // Value in satoshis
    const txid = params.get('txid') || params.get('transaction_hash');
    
    console.log("Payment details:", { address, status, value, txid });

    if (!address) {
      console.log("Missing address in webhook parameters");
      return new Response("Missing address parameter", { status: 400, headers: corsHeaders });
    }

    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find booking by Bitcoin address
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('*, plans(key), users(name, phone, email)')
      .eq('blockonomics_address', address)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found for address:", address, bookingError?.message);
      return new Response("Booking not found", { status: 404, headers: corsHeaders });
    }

    console.log("Found booking:", booking.id, "for address:", address);

    // Verify payment amount if we have the expected amount and received value
    if (booking.bitcoin_amount && value) {
      const expectedSatoshis = Math.round(booking.bitcoin_amount * 100000000); // Convert BTC to satoshis
      const receivedSatoshis = parseInt(value);
      const tolerance = Math.max(1000, expectedSatoshis * 0.01); // 1% tolerance or minimum 1000 sats
      
      console.log("Payment verification:", {
        expected: expectedSatoshis,
        received: receivedSatoshis,
        tolerance: tolerance,
        difference: receivedSatoshis - expectedSatoshis
      });

      if (receivedSatoshis < (expectedSatoshis - tolerance)) {
        console.log("Underpayment detected - rejecting");
        return new Response("Insufficient payment amount", { status: 400, headers: corsHeaders });
      }
      
      if (receivedSatoshis > (expectedSatoshis + tolerance)) {
        console.log("Overpayment detected - accepting but logging");
        // Accept overpayments but log them for monitoring
      }
    }

    // Prevent duplicate transaction processing
    if (txid) {
      console.log("Checking for duplicate transaction:", txid);
      const { data: existingTx, error: txCheckError } = await supabaseClient
        .from('bookings')
        .select('id, error_message')
        .eq('id', booking.id)
        .single();

      if (!txCheckError && existingTx?.error_message?.includes(txid)) {
        console.log("Transaction already processed:", txid);
        return new Response("Transaction already processed", { status: 200, headers: corsHeaders });
      }
    }

    // Check if payment window is still valid (prevent late payments to expired addresses)
    if (booking.blockonomics_created_at) {
      const createdAt = new Date(booking.blockonomics_created_at);
      const windowMs = 20 * 60 * 1000; // 20 minutes
      const expiresAt = new Date(createdAt.getTime() + windowMs);
      const isExpired = Date.now() > expiresAt.getTime();
      
      if (isExpired && booking.payment_status !== 'completed') {
        console.log("Rejecting late payment to expired address:", address, "expired at:", expiresAt.toISOString());
        return new Response("Payment window expired", { status: 400, headers: corsHeaders });
      }
    }

    // Blockonomics status meanings:
    // 0 = Unconfirmed (payment detected but not confirmed)
    // 1 = Partially confirmed (some confirmations)
    // 2 = Confirmed (sufficient confirmations)
    
    const statusNum = parseInt(status || '0');
    let paymentStatus = 'pending';
    let bookingStatus = booking.status;
    
    if (statusNum >= 1) {
      // At least 1 confirmation - consider payment successful
      paymentStatus = 'completed';
      bookingStatus = 'queued'; // Ready for call processing
      
      console.log("Payment confirmed with", statusNum >= 2 ? 'sufficient' : 'partial', "confirmations");
    } else if (statusNum === 0 && value) {
      // Payment detected but not yet confirmed
      paymentStatus = 'processing';
      console.log("Payment detected but waiting for confirmations");
    }

    // Update booking with payment confirmation
    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    };

    // Only update booking status if payment is confirmed
    if (paymentStatus === 'completed') {
      updateData.status = bookingStatus;
    }

    // Store transaction hash if available
    if (txid) {
      updateData.error_message = `Bitcoin TX: ${txid}`; // Reuse this field to store tx hash
    }

    // Store actual payment amount if available
    if (value) {
      const btcReceived = parseInt(value) / 100000000; // Convert satoshis to BTC
      updateData.payment_amount = Math.round(btcReceived * 100000000); // Store as satoshis
      console.log("Bitcoin received:", btcReceived, "BTC");
    }

    // Update the booking
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update(updateData)
      .eq('id', booking.id);

    if (updateError) {
      console.error("Error updating booking:", updateError);
      return new Response("Database update failed", { status: 500, headers: corsHeaders });
    }

    console.log("Booking payment status updated:", booking.id, "->", paymentStatus);

    // If payment is confirmed, initiate call
    if (paymentStatus === 'completed') {
      try {
        console.log("Payment confirmed, initiating VAPI call for booking:", booking.id);
        
        // Initiate call using the same logic as NOWPayments
        const { error: callError } = await supabaseClient.functions.invoke('initiate-vapi-call', {
          body: {
            bookingId: booking.id,
            phone: booking.users.phone,
            name: booking.users.name
          }
        });
        
        if (callError) {
          console.error(`Error initiating call for booking ${booking.id}:`, callError);
          
          // Log failed call attempt for potential manual retry
          try {
            await supabaseClient.from('bookings').update({
              error_message: `Bitcoin TX: ${txid} | Call initiation failed: ${callError.message}`,
              updated_at: new Date().toISOString()
            }).eq('id', booking.id);
          } catch (logError) {
            console.error("Failed to log call initiation error:", logError);
          }
          
          // Don't fail the webhook - the payment was successful
        } else {
          console.log(`Successfully initiated call for booking ${booking.id}`);
        }
      } catch (initiateError) {
        console.error(`Failed to initiate call for booking ${booking.id}:`, initiateError);
        // Don't fail the webhook - the payment was successful
      }
    }

    // Return success response to Blockonomics
    return new Response("OK", {
      headers: corsHeaders,
      status: 200
    });

  } catch (error) {
    console.error("Blockonomics webhook error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Internal server error"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});