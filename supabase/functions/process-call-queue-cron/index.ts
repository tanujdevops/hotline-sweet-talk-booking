import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This is a cron job - validate the request comes from pg_cron or authorized source
    const authHeader = req.headers.get("authorization");
    const expectedAuth = Deno.env.get("CRON_SECRET");
    
    if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
      console.warn("Unauthorized queue processing attempt");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Process queued calls with improved logic
    let totalProcessed = 0;
    let totalErrors = 0;
    const batchSize = 10; // Process in smaller batches for better performance

    console.log("Starting queue processing...");

    // Get queued calls ordered by priority and creation time
    const { data: queuedCalls, error: queueError } = await supabaseClient
      .from('call_queue')
      .select(`
        id,
        booking_id,
        plan_type,
        priority,
        retry_count,
        max_retries,
        created_at,
        bookings!inner(
          id,
          status,
          payment_status,
          users!inner(id, name, phone, email),
          plans!inner(key, vapi_assistant_id, duration_seconds)
        )
      `)
      .eq('status', 'queued')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (queueError) {
      console.error("Failed to get queued calls:", queueError);
      throw new Error(`Failed to get queued calls: ${queueError.message}`);
    }

    if (!queuedCalls || queuedCalls.length === 0) {
      console.log("No queued calls to process");
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        errors: 0,
        message: "No queued calls to process"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found ${queuedCalls.length} queued calls to process`);

    // Process each call
    for (const queueItem of queuedCalls) {
      try {
        console.log(`Processing queue item ${queueItem.id} for booking ${queueItem.booking_id}`);

        // Validate booking is still in a valid state
        if (!['pending', 'queued'].includes(queueItem.bookings.status)) {
          console.log(`Booking ${queueItem.booking_id} is in invalid state ${queueItem.bookings.status}, removing from queue`);
          await supabaseClient
            .from('call_queue')
            .delete()
            .eq('id', queueItem.id);
          continue;
        }

        // For paid plans, ensure payment is completed
        if (queueItem.bookings.plans.key !== 'free_trial') {
          if (queueItem.bookings.payment_status !== 'completed') {
            console.log(`Booking ${queueItem.booking_id} payment not completed, skipping`);
            continue;
          }
        }

        // Check if agent is available for this plan type
        const { data: availableAgent, error: agentError } = await supabaseClient
          .rpc('get_available_agent', { plan_type_param: queueItem.plan_type });

        if (agentError) {
          console.error(`Error getting available agent:`, agentError);
          throw new Error(`Failed to get available agent: ${agentError.message}`);
        }

        if (!availableAgent || availableAgent.length === 0) {
          console.log(`No available agent for plan type ${queueItem.plan_type}, skipping`);
          continue;
        }

        const agent = availableAgent[0];
        
        // Try to initiate the call
        const { error: callError } = await supabaseClient.functions.invoke('initiate-vapi-call', {
          body: { 
            bookingId: queueItem.booking_id,
            queueItemId: queueItem.id 
          }
        });

        if (callError) {
          console.error(`Error initiating call for booking ${queueItem.booking_id}:`, callError);
          
          // Increment retry count
          const newRetryCount = (queueItem.retry_count || 0) + 1;
          
          if (newRetryCount >= queueItem.max_retries) {
            // Max retries reached, mark as failed
            await supabaseClient
              .from('call_queue')
              .update({ 
                status: 'failed',
                retry_count: newRetryCount
              })
              .eq('id', queueItem.id);
              
            await supabaseClient
              .from('bookings')
              .update({ 
                status: 'failed',
                error_message: `Failed to initiate call after ${newRetryCount} attempts`
              })
              .eq('id', queueItem.booking_id);
              
            console.log(`Queue item ${queueItem.id} marked as failed after ${newRetryCount} attempts`);
          } else {
            // Schedule for retry with exponential backoff
            const retryDelay = Math.pow(2, newRetryCount) * 60; // 2, 4, 8 minutes
            const scheduledFor = new Date(Date.now() + retryDelay * 1000);
            
            await supabaseClient
              .from('call_queue')
              .update({ 
                retry_count: newRetryCount,
                scheduled_for: scheduledFor.toISOString()
              })
              .eq('id', queueItem.id);
              
            console.log(`Queue item ${queueItem.id} scheduled for retry ${newRetryCount} in ${retryDelay} seconds`);
          }
          
          totalErrors++;
        } else {
          // Call initiated successfully, remove from queue
          await supabaseClient
            .from('call_queue')
            .delete()
            .eq('id', queueItem.id);
            
          console.log(`Successfully initiated call for booking ${queueItem.booking_id}`);
          totalProcessed++;
        }

      } catch (error) {
        console.error(`Error processing queue item ${queueItem.id}:`, error);
        totalErrors++;
      }
    }

    console.log(`Queue processing complete. Processed: ${totalProcessed}, Errors: ${totalErrors}`);

    return new Response(JSON.stringify({
      success: true,
      processed: totalProcessed,
      errors: totalErrors,
      message: `Processed ${totalProcessed} calls with ${totalErrors} errors`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in queue processing:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});