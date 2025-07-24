import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log('🔄 Running free trial migration...');

    // Update the eligibility check function to be lifetime restriction
    const migration1 = `
      CREATE OR REPLACE FUNCTION public.check_free_trial_eligibility(user_id uuid)
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER SET search_path = ''
      AS $function$
      DECLARE
          last_trial TIMESTAMP WITH TIME ZONE;
      BEGIN
          -- Get the last free trial timestamp
          SELECT last_free_trial INTO last_trial
          FROM public.users
          WHERE id = user_id;

          -- If no previous trial, allow it (first time user)
          IF last_trial IS NULL THEN
              RETURN TRUE;
          END IF;

          -- If user has already used free trial, deny it (lifetime restriction)
          RETURN FALSE;
      END;
      $function$;
    `;

    const migration2 = `
      CREATE OR REPLACE FUNCTION public.check_free_trial_cooldown()
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER SET search_path = ''
      AS $function$
      DECLARE
          last_trial TIMESTAMP WITH TIME ZONE;
      BEGIN
          -- Get the last free trial timestamp for the current user
          SELECT last_free_trial INTO last_trial
          FROM public.users
          WHERE id = auth.uid();

          -- If no previous trial, no restriction
          IF last_trial IS NULL THEN
              RETURN FALSE;
          END IF;

          -- Return true if user has already used their lifetime free trial
          RETURN TRUE;
      END;
      $function$;
    `;

    // Run the migrations
    const { error: error1 } = await supabaseClient.rpc('exec', { 
      sql: migration1 
    }).throwOnError();

    if (error1) {
      console.error('Error running migration 1:', error1);
      throw error1;
    }

    const { error: error2 } = await supabaseClient.rpc('exec', { 
      sql: migration2 
    }).throwOnError();

    if (error2) {
      console.error('Error running migration 2:', error2);
      throw error2;
    }

    console.log('✅ Migration completed successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Free trial logic updated to lifetime restriction',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (error) {
    console.error('❌ MIGRATION ERROR:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});