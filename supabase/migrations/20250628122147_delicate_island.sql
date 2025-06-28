-- Fix API Key Ambiguity in get_available_agent Function
-- This migration fixes the "column reference api_key is ambiguous" error

-- Update the get_available_agent function to use explicit table aliases for all columns
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

-- Create a direct SQL function to get available agents without using get_vapi_api_key
-- This provides a fallback method that avoids the vault complexity
CREATE OR REPLACE FUNCTION get_available_agent_direct(plan_type_param TEXT)
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
    va.agent_id,
    va.id as vapi_agent_id,
    vac.id as account_id,
    vac.api_key,  -- Direct access to API key
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_agent(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_available_agent_direct(TEXT) TO service_role;

-- Add comments
COMMENT ON FUNCTION get_available_agent(TEXT) IS 'Fixed to avoid column ambiguity with explicit table aliases';
COMMENT ON FUNCTION get_available_agent_direct(TEXT) IS 'Direct SQL version that avoids vault complexity for fallback use';