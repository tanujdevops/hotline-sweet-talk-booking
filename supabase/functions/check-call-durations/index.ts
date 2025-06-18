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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Call the check_call_durations function
    const { data: results, error } = await supabaseClient
      .rpc('check_call_durations');

    if (error) {
      throw new DatabaseError(`Failed to check call durations: ${error.message}`);
    }

    // Process any completed calls
    if (results && results.length > 0) {
      console.log(`Processed ${results.length} completed calls:`, results);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results?.length || 0,
        results
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error checking call durations:", error);
    return handleError(error);
  }
}); 