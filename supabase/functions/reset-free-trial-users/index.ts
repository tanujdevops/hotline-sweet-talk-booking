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

    console.log('🔄 Starting free trial user reset...');

    // Get all users with last_free_trial set
    const { data: usersWithFreeTrial, error: fetchError } = await supabaseClient
      .from('users')
      .select('id, name, email, phone, last_free_trial, created_at')
      .not('last_free_trial', 'is', null);

    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError);
      throw new Error(`Failed to fetch users: ${fetchError.message}`);
    }

    console.log(`📊 Found ${usersWithFreeTrial?.length || 0} users with free trial history`);

    if (!usersWithFreeTrial || usersWithFreeTrial.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No users found with free trial history',
        usersReset: 0,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // Reset all users' last_free_trial to NULL
    const { data: resetData, error: resetError } = await supabaseClient
      .from('users')
      .update({ last_free_trial: null })
      .not('last_free_trial', 'is', null)
      .select('id, name, email');

    if (resetError) {
      console.error('❌ Error resetting users:', resetError);
      throw new Error(`Failed to reset users: ${resetError.message}`);
    }

    console.log(`✅ Successfully reset ${resetData?.length || 0} users`);

    // Also clean up any failed free trial bookings from today
    const { data: bookingsData, error: bookingsError } = await supabaseClient
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('status', 'failed')
      .gte('created_at', new Date().toISOString().split('T')[0]) // Today
      .select('id');

    if (bookingsError) {
      console.warn('⚠️ Warning: Could not clean up failed bookings:', bookingsError);
    } else {
      console.log(`🧹 Cleaned up ${bookingsData?.length || 0} failed bookings from today`);
    }

    const result = {
      success: true,
      message: 'Free trial users reset successfully',
      usersReset: resetData?.length || 0,
      failedBookingsCleaned: bookingsData?.length || 0,
      resetUsers: resetData?.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email
      })) || [],
      originalUsers: usersWithFreeTrial.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        lastFreeTrial: u.last_free_trial,
        accountCreated: u.created_at
      })),
      timestamp: new Date().toISOString()
    };

    console.log('📋 Reset Summary:', JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (error) {
    console.error('❌ RESET ERROR:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});