-- Fix API Key Ambiguity in get_available_agent Function
-- This migration fixes the "column reference api_key is ambiguous" error

-- Update the get_available_agent function to use table aliases for all columns
CREATE OR REPLACE FUNCTION get_available_agent(plan_type_param TEXT)
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
  -- First, clean up any stuck calls (calls that have been active for more than 2 hours)
  UPDATE vapi_agents va
  SET current_active_calls = (
    SELECT COUNT(*) 
    FROM active_calls ac 
    WHERE ac.vapi_agent_id = va.id 
    AND ac.started_at > NOW() - INTERVAL '2 hours'
  )
  WHERE va.agent_type = plan_type_param;

  -- Return available agents with decrypted API keys
  -- FIX: Use explicit table aliases for all column references to avoid ambiguity
  RETURN QUERY
  SELECT 
    va.agent_id,
    va.id as vapi_agent_id,
    vac.id as account_id,
    CASE 
      WHEN vac.vault_secret_name IS NOT NULL THEN get_vapi_api_key(vac.id)
      ELSE vac.api_key  -- Use explicit table alias to avoid ambiguity
    END as api_key,
    vac.phone_number_id
  FROM public.vapi_agents va
  JOIN public.vapi_accounts vac ON va.vapi_account_id = vac.id
  WHERE va.agent_type = plan_type_param
    AND va.is_active = true
    AND vac.is_active = true
    AND va.current_active_calls < va.max_concurrent_calls
    AND vac.current_active_calls < vac.max_concurrent_calls
  ORDER BY va.priority ASC, va.current_active_calls ASC
  LIMIT 1;
END;
$$;

-- Create a safe test function for agent availability
CREATE OR REPLACE FUNCTION test_agent_availability_safe()
RETURNS TABLE(
  plan_type TEXT,
  status TEXT,
  agent_count INTEGER,
  total_capacity INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  plan_types TEXT[] := ARRAY['free_trial', 'standard', 'extended'];
  plan_type_val TEXT;
  agent_cnt INTEGER;
  capacity INTEGER;
BEGIN
  FOREACH plan_type_val IN ARRAY plan_types
  LOOP
    -- Count agents for this plan type
    SELECT COUNT(*), COALESCE(SUM(max_concurrent_calls), 0)
    INTO agent_cnt, capacity
    FROM vapi_agents va
    JOIN vapi_accounts vac ON va.vapi_account_id = vac.id
    WHERE va.agent_type = plan_type_val
    AND va.is_active = true
    AND vac.is_active = true;
    
    RETURN QUERY SELECT 
      plan_type_val,
      CASE WHEN agent_cnt > 0 THEN 'AVAILABLE' ELSE 'NO_AGENTS' END::TEXT,
      agent_cnt,
      capacity;
  END LOOP;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION test_agent_availability_safe() TO service_role;
GRANT EXECUTE ON FUNCTION test_agent_availability_safe() TO postgres;

-- Add comments
COMMENT ON FUNCTION get_available_agent(TEXT) IS 'Fixed to avoid column ambiguity with explicit table aliases';
COMMENT ON FUNCTION test_agent_availability_safe() IS 'Safely tests agent availability without causing errors';