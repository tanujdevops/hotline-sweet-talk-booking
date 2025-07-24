import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    // Find calls that have been active for too long (e.g., > 2 hours)
    const { data: staleCalls, error } = await supabaseClient.from('active_calls').select('booking_id, started_at').lt('started_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
    if (error) {
      throw error;
    }
    let processed = 0;
    // Cleanup each stale call
    for (const call of staleCalls){
      try {
        await supabaseClient.rpc('cleanup_inactive_call', {
          p_booking_id: call.booking_id,
          p_status: 'failed',
          p_error_message: 'Call timed out after 2 hours'
        });
        processed++;
      } catch (cleanupError) {
        console.error(`Failed to cleanup stale call ${call.booking_id}:`, cleanupError);
      }
    }
    return new Response(JSON.stringify({
      success: true,
      processed,
      message: `Successfully processed ${processed} stale calls`
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Error checking stale calls:", error);
    const { error: handledError, status } = handleError(error);
    return new Response(JSON.stringify(handledError), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status
    });
  }
});
