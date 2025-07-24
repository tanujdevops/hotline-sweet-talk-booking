import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    console.log("Processing call queue...");
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    // Get queued calls ordered by priority and creation time
    const { data: queuedCalls, error: queueError } = await supabaseClient.from('call_queue').select(`
        *,
        bookings!inner(
          id,
          status,
          users!inner(id, name, phone, email),
          plans!inner(key, vapi_assistant_id)
        )
      `).eq('status', 'queued').lte('scheduled_for', new Date().toISOString()).order('priority').order('created_at').limit(50); // Process up to 50 calls at once
    if (queueError) {
      console.error("Failed to get queued calls:", queueError);
      throw new Error(`Failed to get queued calls: ${queueError.message}`);
    }
    if (!queuedCalls || queuedCalls.length === 0) {
      console.log("No queued calls to process");
      return new Response(JSON.stringify({
        processed: 0,
        message: "No queued calls to process"
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    console.log(`Found ${queuedCalls.length} queued calls`);
    let processed = 0;
    for (const queueItem of queuedCalls){
      try {
        console.log(`Processing queue item ${queueItem.id} for booking ${queueItem.booking_id}`);
        // Check if booking is still in a valid state
        if (![
          'pending',
          'queued'
        ].includes(queueItem.bookings.status)) {
          console.log(`Booking ${queueItem.booking_id} is in invalid state ${queueItem.bookings.status}, removing from queue`);
          await supabaseClient.from('call_queue').delete().eq('id', queueItem.id);
          continue;
        }
        // Check if agent is available for this plan type
        const { data: availableAgent, error: agentError } = await supabaseClient.rpc('get_available_agent', {
          plan_type_param: queueItem.plan_type
        });
        if (agentError || !availableAgent || availableAgent.length === 0) {
          console.log(`No available agent for plan type ${queueItem.plan_type}, skipping`);
          continue;
        }
        const agent1 = availableAgent[0];
        const assistantId = queueItem.bookings.plans.vapi_assistant_id;
        console.log(`Processing call for booking ${queueItem.booking_id} with agent ${agent1.agent_id}, assistant ${assistantId}`);
        // Handle free trial - trust frontend eligibility check, just mark as used
        if (queueItem.bookings.plans.key === 'free_trial') {
          console.log(`Processing free trial for user ${queueItem.bookings.users.id} - trusting frontend eligibility check`);
          
          // Update last free trial timestamp (no need to re-check eligibility)
          console.log(`Marking free trial as used for user ${queueItem.bookings.users.id}`);
          const { error: updateError } = await supabaseClient.rpc('update_last_free_trial', {
            user_id: queueItem.bookings.users.id
          });
          if (updateError) {
            console.error('Error updating last free trial:', updateError);
            throw new Error(`Failed to update free trial status: ${updateError.message}`);
          }
          console.log(`✅ Successfully marked free trial as used for user ${queueItem.bookings.users.id}`);
        }
        // Mark queue item as processing
        await supabaseClient.from('call_queue').update({
          status: 'processing',
          assigned_agent_id: agent1.agent_id,
          assigned_account_id: agent1.account_id
        }).eq('id', queueItem.id);
        // Increment call counts
        const { data: incrementResult, error: incrementError } = await supabaseClient.rpc('increment_call_count', {
          agent_uuid: agent1.agent_id,
          account_uuid: agent1.account_id
        });
        if (incrementError || !incrementResult) {
          console.error('Failed to increment call counts:', incrementError);
          // Update queue item status to failed
          await supabaseClient.from('call_queue').update({
            status: 'failed'
          }).eq('id', queueItem.id);
          continue;
        }
        // Format phone number to E.164 format (e.g., +1234567890)
        const formattedPhone = queueItem.bookings.users.phone.startsWith('+') ? queueItem.bookings.users.phone : `+${queueItem.bookings.users.phone}`;
        console.log(`Formatted phone number: ${formattedPhone}`);
        // Prepare and log the request payload
        const payload = {
          assistantId: assistantId,
          phoneNumberId: agent1.phone_number_id,
          customer: {
            number: formattedPhone,
            name: queueItem.bookings.users.name
          }
        };
        console.log("VAPI Request Payload:", JSON.stringify(payload, null, 2));
        // Make API request to VAPI using the assistant ID from the plan
        const response = await fetch('https://api.vapi.ai/call', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${agent1.api_key}`
          },
          body: JSON.stringify(payload)
        });
        const vapiData = await response.json();
        if (!response.ok) {
          console.error("VAPI API error:", vapiData);
          console.error("Request payload that caused error:", JSON.stringify(payload, null, 2));
          throw new Error(`VAPI API error: ${vapiData.message || JSON.stringify(vapiData)}`);
        }
        // Record active call
        await supabaseClient.from('active_calls').insert([
          {
            booking_id: queueItem.booking_id,
            vapi_call_id: vapiData.id || null,
            vapi_agent_id: agent1.vapi_agent_id,
            vapi_account_id: agent1.account_id
          }
        ]);
        // Update booking status
        await supabaseClient.from('bookings').update({
          status: 'calling',
          vapi_call_id: vapiData.id || null
        }).eq('id', queueItem.booking_id);
        // Remove from queue
        await supabaseClient.from('call_queue').delete().eq('id', queueItem.id);
        // Record call event
        await supabaseClient.from('call_events').insert([
          {
            booking_id: queueItem.booking_id,
            event_type: 'call_initiated_from_queue',
            details: vapiData,
            events: [
              vapiData
            ]
          }
        ]);
        processed++;
        console.log(`Successfully processed call for booking ${queueItem.booking_id}`);
      } catch (error) {
        console.error(`Error processing queue item ${queueItem.id}:`, error);
        // Increment retry count
        const newRetryCount = queueItem.retry_count + 1;
        if (newRetryCount >= queueItem.max_retries) {
          // Mark as failed
          await supabaseClient.from('call_queue').update({
            status: 'failed',
            retry_count: newRetryCount,
            error: error.message
          }).eq('id', queueItem.id);
          // Update booking status
          await supabaseClient.from('bookings').update({
            status: 'failed',
            error_message: error.message
          }).eq('id', queueItem.booking_id);
        } else {
          // Schedule for retry in 30 seconds
          const retryTime = new Date(Date.now() + 30000).toISOString();
          await supabaseClient.from('call_queue').update({
            status: 'queued',
            retry_count: newRetryCount,
            scheduled_for: retryTime,
            assigned_agent_id: null,
            assigned_account_id: null,
            error: error.message
          }).eq('id', queueItem.id);
        }
        // Always decrement call counts on error (safety measure)
        try {
          await supabaseClient.rpc('safe_decrement_call_count', {
            agent_uuid: agent.agent_id,
            account_uuid: agent.account_id
          });
        } catch (decrementError) {
          console.error('Error decrementing call counts:', decrementError);
        }
      }
    }
    console.log(`Processed ${processed} calls from queue`);
    return new Response(JSON.stringify({
      processed,
      message: `Successfully processed ${processed} calls from queue`
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Error in process-call-queue function:", error);
    return new Response(JSON.stringify({
      error: error.message,
      processed: 0
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
