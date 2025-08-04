import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-nowpayments-sig",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};

// Helper function to sort object keys recursively (for signature verification)
function sortObject(obj: any): any {
  if (obj === null || typeof obj !== 'object' || obj instanceof Array) {
    return obj;
  }
  
  const sortedObj: any = {};
  Object.keys(obj).sort().forEach(key => {
    sortedObj[key] = sortObject(obj[key]);
  });
  
  return sortedObj;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("NOWPayments webhook received:", req.method);
    
    // NOWPayments sends payment confirmations via POST request
    if (req.method !== "POST") {
      console.log("Invalid method:", req.method);
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    // Get IPN secret from environment
    const NOWPAYMENTS_IPN_SECRET = Deno.env.get("NOWPAYMENTS_IPN_SECRET");
    if (!NOWPAYMENTS_IPN_SECRET) {
      console.error("NOWPayments IPN secret not configured");
      return new Response("IPN secret not configured", { status: 500, headers: corsHeaders });
    }

    // Get signature from headers
    const receivedSignature = req.headers.get('x-nowpayments-sig');
    if (!receivedSignature) {
      console.error("Missing NOWPayments signature");
      return new Response("Missing signature", { status: 400, headers: corsHeaders });
    }

    // Get request body
    const requestBody = await req.text();
    let webhookData;
    
    try {
      webhookData = JSON.parse(requestBody);
    } catch (parseError) {
      console.error("Invalid JSON in webhook:", parseError);
      return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
    }

    console.log("NOWPayments webhook data:", {
      payment_id: webhookData.payment_id,
      payment_status: webhookData.payment_status,
      order_id: webhookData.order_id
    });

    // Verify HMAC signature (same security model as Stripe)
    const sortedData = sortObject(webhookData);
    const sortedJson = JSON.stringify(sortedData, Object.keys(sortedData).sort());
    
    // Create HMAC signature using sha512
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(NOWPAYMENTS_IPN_SECRET),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(sortedJson)
    );
    
    const computedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (computedSignature !== receivedSignature) {
      console.error("Invalid signature");
      return new Response("Invalid signature", { status: 400, headers: corsHeaders });
    }

    console.log("NOWPayments signature verified successfully");

    // Get booking ID from order_id
    const bookingId = webhookData.order_id;
    
    if (!bookingId) {
      console.log("Missing order_id in webhook data");
      return new Response("Missing order_id", { status: 400, headers: corsHeaders });
    }

    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find booking by ID
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('*, plans(key), users(name, phone, email)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found:", bookingError?.message);
      return new Response("Booking not found", { status: 404, headers: corsHeaders });
    }

    console.log("Found booking:", booking.id);

    // Map NOWPayments statuses to our system (same as Stripe mapping)
    const paymentStatus = webhookData.payment_status;
    let updateData: any = {
      nowpayments_payment_id: webhookData.payment_id,
      updated_at: new Date().toISOString()
    };

    if (paymentStatus === 'finished') {
      // Payment successful - same logic as Stripe webhook
      updateData = {
        ...updateData,
        payment_status: 'completed',
        status: 'queued', // Ready for call processing
        payment_amount: webhookData.actually_paid || webhookData.pay_amount || null
      };
      
      console.log("Payment completed, booking will be queued for call processing");
      
    } else if (paymentStatus === 'failed' || paymentStatus === 'refunded' || paymentStatus === 'expired') {
      // Payment failed - same logic as Stripe
      updateData = {
        ...updateData,
        payment_status: 'failed',
        status: 'payment_failed'
      };
      
      console.log("Payment failed, booking marked as failed");
      
    } else {
      // Payment in progress (waiting, confirming, confirmed, sending)
      updateData = {
        ...updateData,
        payment_status: 'processing'
      };
      
      console.log("Payment in progress, status:", paymentStatus);
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

    console.log("Booking updated successfully:", booking.id);

    // If payment completed, initiate call (EXACT same logic as Stripe webhook)
    if (paymentStatus === 'finished') {
      try {
        console.log("Payment completed, initiating VAPI call");
        
        // Check concurrency before initiating call
        const { data: concurrencyData } = await supabaseClient.functions.invoke('check-vapi-concurrency', {
          body: { bookingId: booking.id }
        });
        
        if (concurrencyData?.canMakeCall === true) {
          // Initiate VAPI call
          await supabaseClient.functions.invoke('initiate-vapi-call', {
            body: {
              bookingId: booking.id,
              phone: booking.users.phone,
              name: booking.users.name
            }
          });
          
          console.log("VAPI call initiated successfully");
        } else {
          console.log("Call queued due to concurrency limits");
        }
      } catch (vapiError) {
        console.error("Error initiating VAPI call after payment:", vapiError);
        // Don't fail the webhook - payment was still successful
      }
    }

    return new Response("Webhook processed successfully", {
      headers: corsHeaders,
      status: 200
    });

  } catch (error) {
    console.error("NOWPayments webhook error:", error);
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