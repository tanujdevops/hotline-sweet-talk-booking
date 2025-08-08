import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

    console.log("Getting Blockonomics status for booking:", bookingId);

    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get booking with Blockonomics details
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('*, users(name, phone, email)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Error fetching booking: ${bookingError?.message || "Booking not found"}`);
    }

    console.log("Found booking:", booking.id);

    // Check if payment has Blockonomics details
    if (!booking.blockonomics_address || !booking.blockonomics_created_at) {
      throw new Error("No Blockonomics payment found for this booking");
    }

    // Calculate remaining time based on creation timestamp
    const createdAt = new Date(booking.blockonomics_created_at);
    const windowMinutes = 20; // 20 minute payment window
    const windowMs = windowMinutes * 60 * 1000;
    const expiresAt = new Date(createdAt.getTime() + windowMs);
    const remainingMs = expiresAt.getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const expired = remainingSeconds <= 0;

    console.log("Payment window:", { 
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      remainingSeconds,
      expired
    });

    // Auto-expire payment if window has closed and payment is still pending
    if (expired && remainingSeconds === 0 && booking.payment_status === 'pending') {
      console.log("Payment window expired, auto-cancelling booking:", booking.id);
      
      try {
        const { error: expireError } = await supabaseClient
          .from('bookings')
          .update({
            payment_status: 'expired',
            status: 'payment_failed',
            blockonomics_address: null, // Clear address to prevent late payments
            bitcoin_amount: null, // Clear amount as well
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingId);

        if (expireError) {
          console.error("Error expiring payment:", expireError);
        } else {
          console.log("Successfully expired payment for booking:", booking.id);
          // Update local booking object for return data
          booking.payment_status = 'expired';
          booking.status = 'payment_failed';
          booking.blockonomics_address = null;
          booking.bitcoin_amount = null;
        }
      } catch (updateError) {
        console.error("Failed to update expired payment:", updateError);
      }
    }

    // Optional: Check Blockonomics API for payment status
    let paymentReceived = false;
    let transactionDetails = null;

    try {
      const BLOCKONOMICS_API_KEY = Deno.env.get("BLOCKONOMICS_API_KEY");
      if (BLOCKONOMICS_API_KEY && booking.blockonomics_address) {
        console.log("Checking Blockonomics for payments to address:", booking.blockonomics_address);
        
        const addressResponse = await fetch(
          `https://www.blockonomics.co/api/address/${booking.blockonomics_address}`,
          {
            headers: {
              'Authorization': `Bearer ${BLOCKONOMICS_API_KEY}`
            }
          }
        );

        if (addressResponse.ok) {
          const addressData = await addressResponse.json();
          console.log("Address status from Blockonomics:", addressData);
          
          // Check if address has received any payments
          if (addressData.total_received && addressData.total_received > 0) {
            paymentReceived = true;
            transactionDetails = {
              totalReceived: addressData.total_received,
              confirmedBalance: addressData.confirmed_balance || 0,
              unconfirmedBalance: addressData.unconfirmed_balance || 0
            };
          }
        } else {
          console.error("Failed to fetch address status from Blockonomics:", addressResponse.status);
        }
      }
    } catch (apiError) {
      console.error("Error checking Blockonomics API:", apiError);
      // Don't fail the request if Blockonomics API check fails
    }

    return new Response(JSON.stringify({
      success: true,
      remainingSeconds,
      expired,
      paymentReceived,
      transactionDetails,
      paymentWindow: windowMinutes,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      bitcoinAddress: booking.blockonomics_address,
      bitcoinAmount: booking.bitcoin_amount,
      currentPaymentStatus: booking.payment_status
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });

  } catch (error) {
    console.error("Error getting Blockonomics status:", error);
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