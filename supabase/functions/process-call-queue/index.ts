
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing call queue...");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // Get queued calls with proper prioritization
    const { data: queuedCalls, error: queueError } = await supabaseClient
      .from('call_queue')
      .select(`
        *,
        bookings!inner(
          id,
          status,
          users!inner(id, name, phone),
          plans!inner(key, vapi_assistant_id)
        )
      `)
      .eq('status', 'queued')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority')
      .order('created_at')
      .limit(10);
      
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    console.log(`Found ${queuedCalls.length} queued calls`);
    let processed = 0;
    
    for (const queueItem of queuedCalls) {
      try {
        console.log(`Processing queue item ${queueItem.id} for booking ${queueItem.booking_id}`);
        
        // Validate booking status
        if (!['pending', 'queued'].includes(queueItem.bookings.status)) {
          console.log(`Booking ${queueItem.booking_id} is in invalid state ${queueItem.bookings.status}, removing from queue`);
          await supabaseClient
            .from('call_queue')
            .delete()
            .eq('id', queueItem.id);
          continue;
        }

        // Handle free trial eligibility check
        if (queueItem.bookings.plans.key === 'free-trial') {
          console.log(`Processing free trial for user ${queueItem.bookings.users.id}`);
          
          const { data: eligibilityData, error: eligibilityError } = await supabaseClient
            .rpc('check_free_trial_eligibility', {
              user_id: queueItem.bookings.users.id
            });

          if (eligibilityError) {
            console.error("Error checking eligibility:", eligibilityError);
            throw new Error("Failed to check free trial eligibility");
          }

          if (!eligibilityData) {
            console.log(`User ${queueItem.bookings.users.id} is not eligible for free trial`);
            await supabaseClient
              .from('call_queue')
              .update({ 
                status: 'cancelled',
                error: 'FREE_TRIAL_LIMIT_EXCEEDED'
              })
              .eq('id', queueItem.id);

            await supabaseClient
              .from('bookings')
              .update({ status: 'cancelled' })
              .eq('id', queueItem.booking_id);
            
            continue;
          }

          // Update last free trial timestamp
          const { error: updateError } = await supabaseClient
            .rpc('update_last_free_trial', {
              user_id: queueItem.bookings.users.id
            });

          if (updateError) {
            console.error('Error updating last free trial:', updateError);
            throw new Error(`Failed to update last free trial: ${updateError.message}`);
          }
        }

        // Get available agent with proper concurrency checking
        const { data: availableAgent, error: agentError } = await supabaseClient
          .rpc('get_available_agent', { plan_type_param: queueItem.plan_type });
          
        if (agentError || !availableAgent || availableAgent.length === 0) {
          console.log(`No available agent for plan type ${queueItem.plan_type}, skipping`);
          continue;
        }
        
        const agent = availableAgent[0];
        console.log(`Using agent ${agent.agent_id} from account ${agent.account_id}`);
        
        // Mark queue item as processing and reserve the agent
        await supabaseClient
          .from('call_queue')
          .update({ 
            status: 'processing',
            assigned_agent_id: agent.vapi_agent_id,
            assigned_account_id: agent.account_id
          })
          .eq('id', queueItem.id);
        
        // Reserve capacity
        await supabaseClient.rpc('increment_call_count', {
          agent_uuid: agent.vapi_agent_id,
          account_uuid: agent.account_id
        });
        
        // Format phone number
        const formattedPhone = queueItem.bookings.users.phone.startsWith('+') ? 
          queueItem.bookings.users.phone : 
          `+${queueItem.bookings.users.phone}`;
        
        // Prepare VAPI request
        const payload = {
          assistantId: queueItem.bookings.plans.vapi_assistant_id,
          phoneNumberId: agent.phone_number_id,
          customer: {
            number: formattedPhone,
            name: queueItem.bookings.users.name
          }
        };
        
        console.log("VAPI Request:", JSON.stringify(payload, null, 2));
        
        // Make VAPI call
        const response = await fetch('https://api.vapi.ai/call', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${agent.api_key}`,
          },
          body: JSON.stringify(payload),
        });

        const vapiData = await response.json();
        
        if (!response.ok) {
          console.error("VAPI API error:", vapiData);
          throw new Error(`VAPI API error: ${vapiData.message || JSON.stringify(vapiData)}`);
        }
        
        console.log("VAPI response:", vapiData);
        
        // Record active call
        await supabaseClient
          .from('active_calls')
          .insert([
            {
              booking_id: queueItem.booking_id,
              vapi_call_id: vapiData.id || null,
              vapi_agent_id: agent.vapi_agent_id,
              vapi_account_id: agent.account_id
            }
          ]);
        
        // Update booking status to calling
        await supabaseClient
          .from('bookings')
          .update({ 
            status: 'calling',
            vapi_call_id: vapiData.id || null
          })
          .eq('id', queueItem.booking_id);
        
        // Remove from queue
        await supabaseClient
          .from('call_queue')
          .delete()
          .eq('id', queueItem.id);
        
        // Record call event
        await supabaseClient
          .from('call_events')
          .insert([
            {
              booking_id: queueItem.booking_id,
              event_type: 'call_initiated_from_queue',
              details: vapiData
            }
          ]);
        
        processed++;
        console.log(`Successfully processed call for booking ${queueItem.booking_id}`);
        
      } catch (error) {
        console.error(`Error processing queue item ${queueItem.id}:`, error);
        
        const newRetryCount = queueItem.retry_count + 1;
        
        if (newRetryCount >= queueItem.max_retries) {
          await supabaseClient
            .from('call_queue')
            .update({ 
              status: 'failed',
              retry_count: newRetryCount,
              error: error.message
            })
            .eq('id', queueItem.id);
            
          await supabaseClient
            .from('bookings')
            .update({ 
              status: 'failed',
              error_message: error.message
            })
            .eq('id', queueItem.booking_id);
        } else {
          const retryTime = new Date(Date.now() + 30000).toISOString();
          await supabaseClient
            .from('call_queue')
            .update({ 
              status: 'queued',
              retry_count: newRetryCount,
              scheduled_for: retryTime,
              assigned_agent_id: null,
              assigned_account_id: null,
              error: error.message
            })
            .eq('id', queueItem.id);
        }
        
        // Cleanup: decrement call counts if they were incremented
        if (queueItem.assigned_agent_id && queueItem.assigned_account_id) {
          await supabaseClient.rpc('decrement_call_count', {
            agent_uuid: queueItem.assigned_agent_id,
            account_uuid: queueItem.assigned_account_id
          });
        }
      }
    }
    
    console.log(`Processed ${processed} calls from queue`);
    
    return new Response(JSON.stringify({ 
      processed,
      message: `Successfully processed ${processed} calls from queue`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("Error processing queue:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      message: "Failed to process queue"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
