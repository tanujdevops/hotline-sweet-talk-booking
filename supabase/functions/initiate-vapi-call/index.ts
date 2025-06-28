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
function handleError(error: unknown): { error: any, status: number } {
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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, phone, name } = await req.json();
    
    if (!bookingId || !phone || !name) {
      throw new ValidationError("Booking ID, phone number, and name are required");
    }
    
    console.log(`Processing call initiation for booking ${bookingId}`);
    
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // Get booking details to determine the plan type
    const { data: bookingData, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        id,
        plans (
          key,
          vapi_assistant_id
        ),
        users (
          id,
          name
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !bookingData) {
      console.error('Error fetching booking:', bookingError);
      throw new ValidationError('Failed to get booking details');
    }

    // Check if this is a free trial booking
    if (bookingData.plans.key === 'free_trial') {
        console.log(`Processing free trial for user ${bookingData.users.id}`);
        
        // Check free trial eligibility
        const { data: eligibilityData, error: eligibilityError } = await supabaseClient
            .rpc('check_free_trial_eligibility', {
                user_id: bookingData.users.id
            });

        if (eligibilityError) {
            console.error("Error checking eligibility:", eligibilityError);
            throw new ValidationError("Failed to check free trial eligibility");
        }

        console.log(`Free trial eligibility check result: ${eligibilityData}`);

        if (!eligibilityData) {
            // Update booking status to indicate ineligibility
            await supabaseClient
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', bookingId);

            return new Response(
                JSON.stringify({
                    status: 'error',
                    code: 'FREE_TRIAL_LIMIT_EXCEEDED',
                    message: 'You have already used your free trial in the last 24 hours. Please purchase a plan to continue.',
                    details: {
                        action: 'redirect_to_pricing',
                        message: 'Please purchase a plan to continue using our service.'
                    }
                }),
                {
                    status: 403,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
                    },
                }
            );
        }

        // Update last free trial timestamp
        console.log(`Updating last free trial for user ${bookingData.users.id}`);
        const { error: updateError } = await supabaseClient
            .rpc('update_last_free_trial', {
                user_id: bookingData.users.id
            });

        if (updateError) {
            console.error('Error updating last free trial:', updateError);
            throw new ValidationError(`Failed to update last free trial: ${updateError.message}`);
        }

        // Verify the update
        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('last_free_trial')
            .eq('id', bookingData.users.id)
            .single();

        if (userError) {
            console.error('Error verifying last free trial update:', userError);
        } else {
            console.log(`Updated last_free_trial to: ${userData.last_free_trial}`);
        }
    }

    const assistantId = bookingData.plans.vapi_assistant_id;
    const customerName = bookingData.users.name;
    console.log(`Plan type for booking ${bookingId}: ${bookingData.plans.key}, Assistant ID: ${assistantId}`);
    
    // Use the test_agent_availability_safe function to check availability
    try {
      const { data: agentAvailability, error: availabilityError } = await supabaseClient
        .rpc('test_agent_availability_safe');
        
      if (availabilityError) {
        console.error('Error checking agent availability:', availabilityError);
      } else {
        // Find the entry for our plan type
        const planEntry = agentAvailability?.find(entry => entry.plan_type === bookingData.plans.key);
        const hasAvailableAgent = planEntry && planEntry.agent_count > 0;
        
        if (!hasAvailableAgent) {
          console.log(`No available agents for plan type ${bookingData.plans.key}, queuing call`);
          
          // Add to queue
          const { error: queueError } = await supabaseClient
            .from('call_queue')
            .insert(
              {
                booking_id: bookingId,
                plan_type: bookingData.plans.key,
                priority: bookingData.plans.key === 'free_trial' ? 2 : 1, // Lower priority for free trials
                status: 'queued'
              }
            );
          
          if (queueError) {
            console.error('Error adding to queue:', queueError);
            throw new ValidationError('Failed to queue call');
          }
          
          return new Response(
            JSON.stringify({ 
              message: 'No agents available. Call has been queued.',
              status: 'queued'
            }),
            { 
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200 
            }
          );
        }
      }
    } catch (error) {
      console.error("Error checking agent availability:", error);
      // Continue with direct query approach
    }
    
    // Get available agent using direct SQL to avoid the API key ambiguity
    const { data: availableAgents, error: agentError } = await supabaseClient
      .from('vapi_agents')
      .select(`
        id,
        agent_id,
        vapi_account_id,
        vapi_accounts!inner(
          id,
          phone_number_id
        )
      `)
      .eq('agent_type', bookingData.plans.key)
      .eq('is_active', true)
      .lt('current_active_calls', 'max_concurrent_calls')
      .order('priority', { ascending: true })
      .order('current_active_calls', { ascending: true })
      .limit(1);
      
    if (agentError || !availableAgents || availableAgents.length === 0) {
      console.error("Error getting available agent:", agentError);
      throw new ValidationError('Failed to get available agent');
    }
    
    const agent = availableAgents[0];
    console.log(`Using agent ${agent.agent_id} from account ${agent.vapi_account_id}`);
    
    // Get API key directly using RPC call to avoid ambiguity
    let apiKey;
    try {
      const { data: keyData, error: keyError } = await supabaseClient
        .rpc('get_vapi_api_key', { account_uuid: agent.vapi_accounts.id });
        
      if (keyError) {
        console.error("Error getting API key from vault:", keyError);
        throw new ValidationError('Failed to get valid API key');
      }
      
      apiKey = keyData;
    } catch (e) {
      console.error("Error getting API key from vault:", e);
      throw new ValidationError('Failed to get valid API key');
    }
    
    if (!apiKey || apiKey === '[ENCRYPTED]') {
      throw new ValidationError('Failed to get valid API key');
    }
    
    console.log(`Phone number ID: ${agent.vapi_accounts.phone_number_id}`);
    console.log(`Customer phone number: ${phone}`);
    
    // Format phone number to E.164 format (e.g., +1234567890)
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    console.log(`Formatted phone number: ${formattedPhone}`);
    
    // Increment call counts
    const { data: incrementResult, error: incrementError } = await supabaseClient.rpc('increment_call_count', {
      agent_uuid: agent.id,
      account_uuid: agent.vapi_accounts.id
    });
    
    if (incrementError || !incrementResult) {
      console.error('Failed to increment call counts:', incrementError);
      throw new ConcurrencyError('Unable to reserve agent capacity');
    }
    
    // Prepare and log the request payload
    const payload = {
      assistantId: assistantId,
      phoneNumberId: agent.vapi_accounts.phone_number_id,
      customer: {
        number: formattedPhone,
        name: customerName
      }
    };
    console.log("VAPI Request Payload:", JSON.stringify(payload, null, 2));
    
    // Make API request to VAPI using the assistant ID from the plan
    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
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
    const { error: activeCallError } = await supabaseClient
      .from('active_calls')
      .insert([
        {
          booking_id: bookingId,
          vapi_call_id: vapiData.id || null,
          vapi_agent_id: agent.id,
          vapi_account_id: agent.vapi_accounts.id
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
    const { error: bookingUpdateError } = await supabaseClient
      .from('bookings')
      .update({ 
        status: 'calling',
        vapi_call_id: vapiData.id || null
      })
      .eq('id', bookingId);
      
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
    const { error: eventError } = await supabaseClient
      .from('call_events')
      .insert([
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error initiating VAPI call:", error);
    const { error: handledError, status } = handleError(error);
    
    return new Response(JSON.stringify(handledError), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});