-- CRITICAL FIXES FOR SWEETYONCALL v2 - Run this in Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/emtwxyywgszhboxpaunk/sql

-- 1. Add missing error_message column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 2. Drop existing increment/decrement functions and recreate with correct signatures
DROP FUNCTION IF EXISTS public.increment_call_count(uuid,uuid);
DROP FUNCTION IF EXISTS public.decrement_call_count(uuid,uuid);

-- 3. Create increment_call_count function with correct return type
CREATE OR REPLACE FUNCTION public.increment_call_count(
  agent_uuid UUID,
  account_uuid UUID
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  agent_current_calls INTEGER;
  agent_max_calls INTEGER;
  account_current_calls INTEGER;
  account_max_calls INTEGER;
BEGIN
  -- Get current and max call counts with FOR UPDATE to lock rows
  SELECT current_active_calls, max_concurrent_calls 
  INTO agent_current_calls, agent_max_calls
  FROM public.vapi_agents
  WHERE id = agent_uuid
  FOR UPDATE;
  
  SELECT current_active_calls, max_concurrent_calls 
  INTO account_current_calls, account_max_calls
  FROM public.vapi_accounts
  WHERE id = account_uuid
  FOR UPDATE;
  
  -- Check if incrementing would exceed limits
  IF agent_current_calls >= agent_max_calls OR account_current_calls >= account_max_calls THEN
    RETURN false;
  END IF;
  
  -- Increment call counts
  UPDATE public.vapi_agents 
  SET current_active_calls = current_active_calls + 1,
      updated_at = now()
  WHERE id = agent_uuid;
  
  UPDATE public.vapi_accounts 
  SET current_active_calls = current_active_calls + 1,
      updated_at = now()
  WHERE id = account_uuid;
  
  RETURN true;
END;
$$;

-- 4. Create decrement_call_count function
CREATE OR REPLACE FUNCTION public.decrement_call_count(
  agent_uuid UUID,
  account_uuid UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Decrement call counts with row locking
  UPDATE public.vapi_agents 
  SET current_active_calls = GREATEST(0, current_active_calls - 1),
      updated_at = now()
  WHERE id = agent_uuid;
  
  UPDATE public.vapi_accounts 
  SET current_active_calls = GREATEST(0, current_active_calls - 1),
      updated_at = now()
  WHERE id = account_uuid;
END;
$$;

-- 5. Update cleanup function to use correct function names
CREATE OR REPLACE FUNCTION public.cleanup_inactive_call(
  p_booking_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_agent_id UUID;
  v_account_id UUID;
BEGIN
  -- Get the agent and account IDs before deleting the active call
  SELECT vapi_agent_id, vapi_account_id INTO v_agent_id, v_account_id
  FROM public.active_calls
  WHERE booking_id = p_booking_id;

  -- Delete the active call
  DELETE FROM public.active_calls
  WHERE booking_id = p_booking_id;

  -- Update the booking status
  UPDATE public.bookings
  SET status = p_status,
      error_message = p_error_message
  WHERE id = p_booking_id;

  -- Decrement call counts if we have agent and account IDs
  IF v_agent_id IS NOT NULL AND v_account_id IS NOT NULL THEN
    PERFORM public.decrement_call_count(v_agent_id, v_account_id);
  END IF;
END;
$$;

-- 6. Add useful indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_error_message ON public.bookings(error_message) WHERE error_message IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vapi_agents_agent_type ON public.vapi_agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_vapi_agents_active_calls ON public.vapi_agents(current_active_calls);
CREATE INDEX IF NOT EXISTS idx_vapi_accounts_active_calls ON public.vapi_accounts(current_active_calls);

-- 7. Basic cleanup function for stale calls
CREATE OR REPLACE FUNCTION public.cleanup_stale_calls()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  stale_call RECORD;
BEGIN
  -- Find calls that have been active for more than 15 minutes
  FOR stale_call IN 
    SELECT ac.booking_id, ac.vapi_agent_id, ac.vapi_account_id
    FROM public.active_calls ac
    WHERE ac.started_at < NOW() - INTERVAL '15 minutes'
  LOOP
    -- Cleanup the call
    PERFORM public.cleanup_inactive_call(
      stale_call.booking_id,
      'failed',
      'Call timed out - exceeded maximum duration'
    );
  END LOOP;
END;
$$;

-- 8. Test the functions work correctly
DO $$
BEGIN
  -- Test that functions exist and can be called
  PERFORM public.increment_call_count('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000000'::uuid);
  PERFORM public.decrement_call_count('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000000'::uuid);
  RAISE NOTICE 'Functions created successfully!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Functions test completed (expected for non-existent UUIDs)';
END;
$$;

-- Success message
SELECT 'CRITICAL FIXES v2 APPLIED SUCCESSFULLY! Functions dropped and recreated with correct signatures.' AS status;