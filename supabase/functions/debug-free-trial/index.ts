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
    const { userId, phone } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`🔍 DEBUG: Starting free trial debug for user ${userId}`);

    // 1. Check if free_trial plan exists
    const { data: planData, error: planError } = await supabaseClient
      .from('plans')
      .select('*')
      .eq('key', 'free_trial')
      .single();

    console.log(`📋 PLAN DATA:`, { planData, planError });

    // 2. Check user eligibility
    const { data: eligibilityData, error: eligibilityError } = await supabaseClient
      .rpc('check_free_trial_eligibility', { user_id: userId });

    console.log(`✅ ELIGIBILITY:`, { eligible: eligibilityData, error: eligibilityError });

    // 3. Check user's last free trial
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('last_free_trial, created_at')
      .eq('id', userId)
      .single();

    console.log(`👤 USER DATA:`, { userData, userError });

    // 4. Check all free trial bookings for this user (lifetime)
    const { data: freeTrialBookings, error: bookingsError } = await supabaseClient
      .from('bookings')
      .select(`
        id, 
        status, 
        payment_status, 
        created_at,
        plans!inner(key)
      `)
      .eq('user_id', userId)
      .eq('plans.key', 'free_trial')
      .order('created_at', { ascending: false });

    console.log(`📚 FREE TRIAL BOOKINGS:`, { freeTrialBookings, bookingsError });

    // 5. Check VAPI accounts
    const { data: vapiAccounts, error: vapiError } = await supabaseClient
      .from('vapi_accounts')
      .select('id, current_active_calls, max_concurrent_calls, is_active')
      .eq('is_active', true);

    console.log(`📞 VAPI ACCOUNTS:`, { vapiAccounts, vapiError });

    // Compile debug report
    const debugReport = {
      timestamp: new Date().toISOString(),
      userId,
      phone,
      checks: {
        plan: {
          exists: !!planData,
          hasAssistantId: !!planData?.vapi_assistant_id,
          data: planData,
          error: planError
        },
        eligibility: {
          eligible: eligibilityData,
          error: eligibilityError
        },
        user: {
          exists: !!userData,
          lastFreeTrial: userData?.last_free_trial,
          hasUsedFreeTrial: userData?.last_free_trial !== null,
          timeSinceLastTrial: userData?.last_free_trial 
            ? (Date.now() - new Date(userData.last_free_trial).getTime()) / (1000 * 60 * 60)
            : null,
          data: userData,
          error: userError
        },
        freeTrialBookings: {
          count: freeTrialBookings?.length || 0,
          bookings: freeTrialBookings,
          error: bookingsError
        },
        vapi: {
          accountsActive: vapiAccounts?.length || 0,
          canMakeCall: vapiAccounts?.[0] 
            ? vapiAccounts[0].current_active_calls < vapiAccounts[0].max_concurrent_calls
            : false,
          accounts: vapiAccounts,
          error: vapiError
        }
      }
    };

    console.log(`📊 COMPLETE DEBUG REPORT:`, JSON.stringify(debugReport, null, 2));

    return new Response(JSON.stringify(debugReport), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (error) {
    console.error('❌ DEBUG ERROR:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});