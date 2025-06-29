import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIdentifier } from "../_shared/rate-limiter.ts";
// Custom error classes for better error handling
class AppError extends Error {
  statusCode;
  code;
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR'){
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}
class DatabaseError extends AppError {
  constructor(message){
    super(message, 500, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}
class ValidationError extends AppError {
  constructor(message){
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
class ConcurrencyError extends AppError {
  constructor(message){
    super(message, 409, 'CONCURRENCY_ERROR');
    this.name = 'ConcurrencyError';
  }
}
// Helper function to handle errors consistently
function handleError(error) {
  console.error('Error:', error);
  if (error instanceof AppError) {
    return new Response(JSON.stringify({
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode
      }
    }), {
      status: error.statusCode,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  // Handle unknown errors
  return new Response(JSON.stringify({
    error: {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      statusCode: 500
    }
  }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
// Helper function to retry database operations
async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  let lastError = null;
  for(let i = 0; i < maxRetries; i++){
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise((resolve)=>setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vapi-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  // Rate limiting for webhook endpoint (100 requests per minute)
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId, {
    maxRequests: 100,
    windowMs: 60 * 1000 // 1 minute
  });
  if (!rateLimit.allowed) {
    console.warn(`Rate limit exceeded for client: ${clientId}`);
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: {
        ...corsHeaders,
        "Retry-After": Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": rateLimit.resetTime.toString()
      }
    });
  }
  let webhookData;
  let rawBody;
  try {
    // Get the raw body for signature validation
    rawBody = await req.text();
    // Get VAPI webhook secret from environment
    const VAPI_WEBHOOK_SECRET = Deno.env.get("VAPI_WEBHOOK_SECRET");
    if (VAPI_WEBHOOK_SECRET) {
      // Get signature from headers
      const signature = req.headers.get("x-vapi-signature");
      if (!signature) {
        console.error("Missing VAPI webhook signature");
        return new Response("Missing webhook signature", {
          status: 401,
          headers: corsHeaders
        });
      }
      // Validate signature (VAPI typically uses HMAC-SHA256)
      const crypto = await import("node:crypto");
      const expectedSignature = crypto.createHmac("sha256", VAPI_WEBHOOK_SECRET).update(rawBody).digest("hex");
      // Compare signatures securely
      const providedSignature = signature.replace("sha256=", "");
      if (!crypto.timingSafeEqual(Buffer.from(expectedSignature, "hex"), Buffer.from(providedSignature, "hex"))) {
        console.error("Invalid VAPI webhook signature");
        return new Response("Invalid webhook signature", {
          status: 401,
          headers: corsHeaders
        });
      }
    } else {
      console.warn("VAPI_WEBHOOK_SECRET not configured - webhook signature validation disabled");
    }
    // Parse the webhook data
    webhookData = JSON.parse(rawBody);
    // Log webhook received (without sensitive data)
    console.log(`Received VAPI webhook: ${webhookData.message?.type || 'unknown'} event`);
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { message } = webhookData;
    if (!message || !message.call) {
      console.log("No call data in webhook");
      return new Response(JSON.stringify({
        success: true
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    const callId = message.call.id;
    const eventType = message.type;
    // Processing webhook event
    // Find the active call
    const { data: activeCall, error: activeCallError } = await supabaseClient.from('active_calls').select('*').eq('vapi_call_id', callId).single();
    if (activeCallError || !activeCall) {
      console.log("No active call found for webhook event");
      return new Response(JSON.stringify({
        success: true
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    // Found active call for processing
    // Record the event
    await supabaseClient.from('call_events').insert([
      {
        booking_id: activeCall.booking_id,
        event_type: eventType,
        details: webhookData
      }
    ]);
    // Handle status update events
    if (eventType === 'status-update') {
      const status = message.status;
      // Processing status update event
      if (status === 'ended') {
        // Call ended, updating status
        // Use transaction to handle call end
        const { error: transactionError } = await supabaseClient.rpc('handle_call_end', {
          p_booking_id: activeCall.booking_id,
          p_call_id: callId,
          p_agent_id: activeCall.vapi_agent_id,
          p_account_id: activeCall.vapi_account_id,
          p_ended_reason: message.endedReason
        });
        if (transactionError) {
          console.error("Error in call end transaction:", transactionError);
          throw new Error("Failed to process call end");
        }
        // Successfully processed call end
        // Trigger queue processing
        const { error: queueError } = await supabaseClient.functions.invoke('process-call-queue', {
          method: 'POST',
          body: {
            booking_id: activeCall.booking_id
          }
        });
        if (queueError) {
          console.error("Error triggering queue processing:", queueError);
        } else {
          console.log("Successfully triggered queue processing");
        }
      }
    }
    return new Response(JSON.stringify({
      success: true
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
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
