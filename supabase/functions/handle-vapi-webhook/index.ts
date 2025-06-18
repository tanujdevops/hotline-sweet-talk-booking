import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Custom error classes for better error handling
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 500, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

class ConcurrencyError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONCURRENCY_ERROR');
    this.name = 'ConcurrencyError';
  }
}

// Helper function to handle errors consistently
function handleError(error: unknown): Response {
  console.error('Error:', error);

  if (error instanceof AppError) {
    return new Response(
      JSON.stringify({
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode
        }
      }),
      {
        status: error.statusCode,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  // Handle unknown errors
  return new Response(
    JSON.stringify({
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
        statusCode: 500
      }
    }),
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

// Helper function to retry database operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vapi-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookData = await req.json();
    console.log("Received VAPI webhook:", JSON.stringify(webhookData, null, 2));
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    const { message } = webhookData;
    
    if (!message || !message.call) {
      console.log("No call data in webhook");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const callId = message.call.id;
    const eventType = message.type;
    
    console.log(`Processing ${eventType} event for call ${callId}`);
    
    // Find the active call
    const { data: activeCall, error: activeCallError } = await supabaseClient
      .from('active_calls')
      .select('*')
      .eq('vapi_call_id', callId)
      .single();
    
    if (activeCallError || !activeCall) {
      console.log(`No active call found for VAPI call ${callId}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found active call for booking ${activeCall.booking_id}`);

    // Record the event
    await supabaseClient
      .from('call_events')
      .insert([
        {
          booking_id: activeCall.booking_id,
          event_type: eventType,
          details: webhookData
        }
      ]);
    
    // Handle status update events
    if (eventType === 'status-update') {
      const status = message.status;
      console.log(`Processing status update: ${status} for call ${callId}`);
      
      if (status === 'ended') {
        console.log(`Call ${callId} ended, updating status`);
        
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

        console.log(`Successfully processed call end for booking ${activeCall.booking_id}`);

        // Trigger queue processing
        const { error: queueError } = await supabaseClient.functions.invoke('process-call-queue', {
          method: 'POST',
          body: { booking_id: activeCall.booking_id }
        });

        if (queueError) {
          console.error("Error triggering queue processing:", queueError);
        } else {
          console.log("Successfully triggered queue processing");
        }
      }
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
