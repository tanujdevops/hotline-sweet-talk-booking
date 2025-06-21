-- Add missing columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS call_duration INTEGER,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Update the bookings table structure to include call_duration and error_message
COMMENT ON COLUMN public.bookings.call_duration IS 'Duration of the call in seconds';
COMMENT ON COLUMN public.bookings.error_message IS 'Error message if booking fails';

-- Create missing database functions referenced in the codebase

-- Function to safely increment call counts
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

-- Function to safely decrement call counts
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

-- Function to get available agent for a plan type
CREATE OR REPLACE FUNCTION public.get_available_agent(plan_type_param TEXT)
RETURNS TABLE(
  agent_id UUID,
  vapi_agent_id UUID,
  account_id UUID,
  api_key TEXT,
  phone_number_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    va.id as agent_id,
    va.agent_id as vapi_agent_id,
    vac.id as account_id,
    vac.api_key,
    vac.phone_number_id
  FROM public.vapi_agents va
  JOIN public.vapi_accounts vac ON va.vapi_account_id = vac.id
  WHERE va.is_active = true 
    AND vac.is_active = true
    AND va.agent_type = plan_type_param
    AND va.current_active_calls < va.max_concurrent_calls
    AND vac.current_active_calls < vac.max_concurrent_calls
  ORDER BY va.priority ASC, va.current_active_calls ASC
  LIMIT 1;
END;
$$;

-- Function to generate booking ID
CREATE OR REPLACE FUNCTION public.generate_booking_id()
RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN gen_random_uuid();
END;
$$;

-- Update the existing cleanup function to use the correct function names
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
      error_message = p_error_message,
      updated_at = now()
  WHERE id = p_booking_id;

  -- Decrement call counts if we have agent and account IDs
  IF v_agent_id IS NOT NULL AND v_account_id IS NOT NULL THEN
    PERFORM public.decrement_call_count(v_agent_id, v_account_id);
  END IF;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_call_duration ON public.bookings(call_duration);
CREATE INDEX IF NOT EXISTS idx_bookings_error_message ON public.bookings(error_message) WHERE error_message IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vapi_agents_agent_type ON public.vapi_agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_vapi_agents_active_calls ON public.vapi_agents(current_active_calls);
CREATE INDEX IF NOT EXISTS idx_vapi_accounts_active_calls ON public.vapi_accounts(current_active_calls);