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
    return {
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode
      },
      status: error.statusCode
    };
  }
  // Handle unknown errors
  return {
    error: {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      statusCode: 500
    },
    status: 500
  };
}
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { bookingId, phone, name } = await req.json();
    if (!bookingId || !phone || !name) {
      throw new ValidationError("Booking ID, phone number, and name are required");
    }
    console.log(`Processing call initiation for booking ${bookingId}`);
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    // Get booking details to determine the plan type
    const { data: bookingData, error: bookingError } = await supabaseClient.from('bookings').select(`
        id,
        plans (
          key,
          vapi_assistant_id
        ),
        users (
          id,
          name
        )
      `).eq('id', bookingId).single();
    if (bookingError || !bookingData) {
      console.error('Error fetching booking:', bookingError);
      throw new ValidationError('Failed to get booking details');
    }
    // Check if this is a free trial booking
    if (bookingData.plans.key === 'free_trial') {
      console.log(`Processing free trial for user ${bookingData.users.id}`);
      // Check free trial eligibility
      const { data: eligibilityData, error: eligibilityError } = await supabaseClient.rpc('check_free_trial_eligibility', {
        user_id: bookingData.users.id
      });
      if (eligibilityError) {
        console.error("Error checking eligibility:", eligibilityError);
        throw new ValidationError("Failed to check free trial eligibility");
      }
      console.log(`Free trial eligibility check result: ${eligibilityData}`);
      if (!eligibilityData) {
        // Update booking status to indicate ineligibility
        await supabaseClient.from('bookings').update({
          status: 'cancelled'
        }).eq('id', bookingId);
        return new Response(JSON.stringify({
          status: 'error',
          code: 'FREE_TRIAL_ALREADY_USED',
          message: 'You have already used your free trial. Each account gets one free trial only.',
          details: {
            action: 'redirect_to_pricing',
            message: 'Please purchase a plan to continue using our service.'
          }
        }), {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
          }
        });
      }
      // Update last free trial timestamp
      console.log(`Updating last free trial for user ${bookingData.users.id}`);
      const { error: updateError } = await supabaseClient.rpc('update_last_free_trial', {
        user_id: bookingData.users.id
      });
      if (updateError) {
        console.error('Error updating last free trial:', updateError);
        throw new ValidationError(`Failed to update free trial status: ${updateError.message}`);
      }
      // Verify the update
      const { data: userData, error: userError } = await supabaseClient.from('users').select('last_free_trial').eq('id', bookingData.users.id).single();
      if (userError) {
        console.error('Error verifying last free trial update:', userError);
      } else {
        console.log(`Updated last_free_trial to: ${userData.last_free_trial}`);
      }
    }
    const assistantId = bookingData.plans.vapi_assistant_id;
    const customerName = name; // Use the fresh name from the request instead of database
    console.log(`Plan type for booking ${bookingId}: ${bookingData.plans.key}, Assistant ID: ${assistantId}`);
    console.log(`Using customer name: ${customerName} (from request, not database)`);
    // Fetch the single active VAPI account
    const { data: account, error: accountError } = await supabaseClient.from('vapi_accounts').select('id, current_active_calls, max_concurrent_calls, api_key, phone_number_id').eq('is_active', true).limit(1).single();
    if (accountError || !account) {
      throw new ValidationError(`Failed to get VAPI account: ${accountError?.message}`);
    }
    const canMakeCall = account.current_active_calls < account.max_concurrent_calls;
    if (!canMakeCall) {
      console.log(`Account concurrency limit reached, queuing call for booking ${bookingId}`);
      // Add to queue
      const { error: queueError } = await supabaseClient.from('call_queue').insert({
        booking_id: bookingId,
        plan_type: bookingData.plans.key,
        priority: bookingData.plans.key === 'free_trial' ? 2 : 1,
        status: 'queued'
      });
      if (queueError) {
        console.error('Error adding to queue:', queueError);
        throw new ValidationError('Failed to queue call');
      }
      return new Response(JSON.stringify({
        status: 'queued',
        message: 'All agents are busy. Your call has been queued.'
      }), {
        status: 202,
        headers: corsHeaders
      });
    }
    // Proceed with call initiation using account.api_key, account.phone_number_id, etc.
    // ... existing call initiation logic ...
    // Format phone number to E.164 format (e.g., +1234567890)
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    console.log(`Formatted phone number: ${formattedPhone}`);
    // Increment call counts
    const { data: incrementResult, error: incrementError } = await supabaseClient.rpc('increment_call_count', {
      agent_uuid: account.vapi_agent_id,
      account_uuid: account.id
    });
    if (incrementError || !incrementResult) {
      console.error('Failed to increment call counts:', incrementError);
      throw new ConcurrencyError('Unable to reserve agent capacity');
    }
    // Prepare and log the request payload
    const payload = {
      assistantId: assistantId,
      phoneNumberId: account.phone_number_id,
      customer: {
        number: formattedPhone,
        name: customerName
      }
    };
    console.log("VAPI Request Payload:", JSON.stringify(payload, null, 2));
    // Idempotency: Check if call already initiated for this booking
    const { data: existingActiveCall, error: existingActiveCallError } = await supabaseClient.from('active_calls').select('booking_id').eq('booking_id', bookingId).single();
    if (existingActiveCall) {
      console.log(`Call already initiated for booking ${bookingId}, skipping duplicate initiation.`);
      return new Response(JSON.stringify({
        success: true,
        message: "Call already initiated for this booking."
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    // Make API request to VAPI using the assistant ID from the plan
    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${account.api_key}`
      },
      body: JSON.stringify(payload)
    });
    const vapiData = await response.json();
    if (!response.ok) {
      console.error("VAPI API error:", vapiData);
      console.error("Request payload that caused error:", JSON.stringify(payload, null, 2));
      // Cleanup the call
      await supabaseClient.rpc('cleanup_inactive_call', {
        p_booking_id: bookingId,
        p_status: 'failed',
        p_error_message: `VAPI API error: ${vapiData.message || JSON.stringify(vapiData)}`
      });
      throw new ValidationError(`VAPI API error: ${vapiData.message || JSON.stringify(vapiData)}`);
    }
    console.log("VAPI response:", vapiData);
    // Record active call in database
    const { error: activeCallError } = await supabaseClient.from('active_calls').insert([
      {
        booking_id: bookingId,
        vapi_call_id: vapiData.id || null,
        vapi_agent_id: account.vapi_agent_id,
        vapi_account_id: account.id
      }
    ]);
    if (activeCallError) {
      console.error("Failed to record active call:", activeCallError);
      // Cleanup the call since we couldn't record it
      await supabaseClient.rpc('cleanup_inactive_call', {
        p_booking_id: bookingId,
        p_status: 'failed',
        p_error_message: 'Failed to record active call'
      });
      throw new ValidationError('Failed to record active call');
    }
    // Update booking status
    const { error: bookingUpdateError } = await supabaseClient.from('bookings').update({
      status: 'calling',
      vapi_call_id: vapiData.id || null
    }).eq('id', bookingId);
    if (bookingUpdateError) {
      console.error("Failed to update booking status:", bookingUpdateError);
      // Cleanup the call since we couldn't update the booking
      await supabaseClient.rpc('cleanup_inactive_call', {
        p_booking_id: bookingId,
        p_status: 'failed',
        p_error_message: 'Failed to update booking status'
      });
      throw new ValidationError('Failed to update booking status');
    }
    // Record call event
    const { error: eventError } = await supabaseClient.from('call_events').insert([
      {
        booking_id: bookingId,
        event_type: 'call_initiated',
        details: vapiData
      }
    ]);
    if (eventError) {
      console.error("Failed to record call event:", eventError);
    // We don't throw here as the call was successfully initiated
    }
    // Return success
    return new Response(JSON.stringify({
      success: true,
      call_id: vapiData.id,
      assistant_id: assistantId,
      message: "Call initiated successfully"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Error initiating VAPI call:", error);
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
