-- Test VAPI Agent Availability
-- Run this in your Supabase SQL Editor to verify all plan types have available agents

-- Drop the function first to avoid the return type error
DROP FUNCTION IF EXISTS test_agent_availability_safe();

-- Create a safer test function that doesn't rely on get_available_agent
CREATE OR REPLACE FUNCTION test_agent_availability_safe()
RETURNS TABLE(
  plan_type TEXT,
  status TEXT,
  agent_count INTEGER,
  capacity INTEGER,
  usage INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    va.agent_type,
    CASE WHEN COUNT(*) > 0 THEN 'AVAILABLE' ELSE 'NO_AGENT' END,
    COUNT(*)::INTEGER,
    SUM(va.max_concurrent_calls)::INTEGER,
    SUM(va.current_active_calls)::INTEGER
  FROM vapi_agents va
  JOIN vapi_accounts vac ON va.vapi_account_id = vac.id
  WHERE va.is_active = true
  AND vac.is_active = true
  AND va.current_active_calls < va.max_concurrent_calls
  AND vac.current_active_calls < vac.max_concurrent_calls
  GROUP BY va.agent_type
  ORDER BY va.agent_type;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION test_agent_availability_safe() TO service_role;
GRANT EXECUTE ON FUNCTION test_agent_availability_safe() TO postgres;

-- Run the safer test function
SELECT * FROM test_agent_availability_safe();

-- Test 2: Check account status using the view
SELECT 
  name,
  key_status,
  max_concurrent_calls,
  current_active_calls,
  is_active
FROM vapi_account_status
ORDER BY name;

-- Test 3: Check agent distribution
SELECT 
  agent_type,
  COUNT(*) as agent_count,
  SUM(va.max_concurrent_calls) as total_capacity,
  SUM(va.current_active_calls) as current_usage
FROM vapi_agents va
WHERE va.is_active = true
GROUP BY agent_type
ORDER BY agent_type;

-- Test 4: Check plans have assistant IDs
SELECT 
  key as plan_type,
  CASE WHEN vapi_assistant_id IS NOT NULL THEN 'CONFIGURED' ELSE 'MISSING' END as assistant_status,
  vapi_assistant_id,
  price_cents,
  duration_seconds
FROM plans
ORDER BY key;

-- Add comment
COMMENT ON FUNCTION test_agent_availability_safe() IS 'Safely tests agent availability without causing errors';