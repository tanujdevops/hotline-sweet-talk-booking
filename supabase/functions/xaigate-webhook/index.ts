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
    console.log("XaiGate webhook received:", req.method);
    
    // XaiGate webhooks are typically POST requests
    if (req.method !== "POST") {
      console.log("Invalid method:", req.method);
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const webhookData = await req.json();
    console.log("XaiGate webhook data:", JSON.stringify(webhookData, null, 2));

    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Basic webhook validation - adjust based on XaiGate's actual webhook format
    if (!webhookData.invoiceNo) {
      console.log("Missing invoiceNo in webhook data");
      return new Response("Invalid webhook data", { status: 400, headers: corsHeaders });
    }

    // Find booking by XaiGate invoice ID
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('*, plans(key), users(name, phone, email)')
      .eq('xaigate_invoice_id', webhookData.invoiceNo)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found:", bookingError?.message);
      return new Response("Booking not found", { status: 404, headers: corsHeaders });
    }

    console.log("Found booking:", booking.id);

    // Update booking based on payment status
    let updateData: any = {
      crypto_payment_data: webhookData,
      updated_at: new Date().toISOString()
    };

    // Check payment status from webhook
    if (webhookData.status === 'paid' || webhookData.status === 'completed') {
      updateData.payment_status = 'completed';
      updateData.status = 'queued'; // Ready for call processing
      
      if (webhookData.txHash) {
        updateData.crypto_transaction_hash = webhookData.txHash;
      }
    } else if (webhookData.status === 'expired' || webhookData.status === 'cancelled') {
      updateData.payment_status = 'failed';
      updateData.status = 'cancelled';
    } else {
      // Payment is still pending
      updateData.payment_status = 'pending';
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

    // If payment is completed, we could trigger call initiation here
    if (webhookData.status === 'paid' || webhookData.status === 'completed') {
      console.log("Payment completed for booking:", booking.id);
      // TODO: Trigger call initiation
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });

  } catch (error) {
    console.error("XaiGate webhook error:", error);
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