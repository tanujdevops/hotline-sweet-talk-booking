import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createErrorResponse, createSuccessResponse, handleCors, parseRequestBody } from "../_shared/response.ts";
import { validateInput, ValidationError } from "../_shared/validation.ts";
serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Validate request method
    if (req.method !== "POST") {
      return createErrorResponse("INVALID_METHOD", "Only POST requests are allowed", null, 405);
    }

    // Parse and validate request body
    const body = await parseRequestBody(req);
    
    try {
      validateInput(body, {
        planType: { 
          required: false, 
          type: 'string', 
          allowedValues: ['free_trial', 'standard', 'extended'] 
        }
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return createErrorResponse("VALIDATION_ERROR", error.message, null, 400);
      }
      throw error;
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing required environment variables");
      return createErrorResponse("CONFIG_ERROR", "Server configuration error", null, 500);
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch the single active VAPI account
    const { data: account, error: accountError } = await supabaseClient
      .from('vapi_accounts')
      .select('id, current_active_calls, max_concurrent_calls')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (accountError) {
      console.error("Database error fetching VAPI account:", accountError);
      return createErrorResponse("DATABASE_ERROR", "Failed to fetch VAPI account", accountError, 500);
    }

    if (!account) {
      return createErrorResponse("NO_ACCOUNT", "No active VAPI account found", null, 503);
    }

    const canMakeCall = account.current_active_calls < account.max_concurrent_calls;

    // If cannot make call, get queue position
    let queuePosition = null;
    if (!canMakeCall) {
      const { count, error: queueError } = await supabaseClient
        .from('call_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued');
        
      if (queueError) {
        console.error("Error fetching queue count:", queueError);
        // Don't fail the request, just set queue position to unknown
        queuePosition = -1;
      } else {
        queuePosition = (count || 0) + 1;
      }
    }

    return createSuccessResponse({
      canMakeCall,
      queuePosition,
      planType: body.planType,
      currentCalls: account.current_active_calls,
      maxCalls: account.max_concurrent_calls
    });

  } catch (error) {
    console.error("Unexpected error in check-vapi-concurrency:", error);
    return createErrorResponse("INTERNAL_ERROR", "An unexpected error occurred", null, 500);
  }
});