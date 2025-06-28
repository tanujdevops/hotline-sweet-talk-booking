-- Test VAPI Setup Migration
-- This migration creates a safe test function to verify VAPI integration

-- Create a safe test function for VAPI setup
CREATE OR REPLACE FUNCTION test_vapi_setup()
RETURNS TABLE(
  component TEXT,
  status TEXT,
  details TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  account_count INTEGER;
  agent_count INTEGER;
  plan_count INTEGER;
  account_rec RECORD;
  plan_rec RECORD;
BEGIN
  -- Test 1: Check accounts
  SELECT COUNT(*) INTO account_count
  FROM vapi_accounts
  WHERE is_active = true;
  
  RETURN QUERY SELECT 
    'VAPI Accounts'::TEXT,
    CASE WHEN account_count > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    ('Found ' || account_count || ' active accounts')::TEXT;

  -- Test 2: Check agents
  SELECT COUNT(*) INTO agent_count
  FROM vapi_agents
  WHERE is_active = true;
  
  RETURN QUERY SELECT 
    'VAPI Agents'::TEXT,
    CASE WHEN agent_count > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    ('Found ' || agent_count || ' active agents')::TEXT;

  -- Test 3: Check plans have assistant IDs
  SELECT COUNT(*) INTO plan_count
  FROM plans
  WHERE vapi_assistant_id IS NOT NULL;
  
  RETURN QUERY SELECT 
    'Plan Assistant IDs'::TEXT,
    CASE WHEN plan_count = 3 THEN 'PASS' ELSE 'INCOMPLETE' END::TEXT,
    ('Found ' || plan_count || ' of 3 plans with assistant IDs')::TEXT;

  -- Test 4: Check each plan type
  FOR plan_rec IN 
    SELECT key FROM plans
  LOOP
    BEGIN
      -- Check if we have agents for this plan type
      SELECT COUNT(*) INTO agent_count
      FROM vapi_agents
      WHERE agent_type = plan_rec.key
      AND is_active = true;
      
      RETURN QUERY SELECT 
        ('Plan: ' || plan_rec.key)::TEXT,
        CASE WHEN agent_count > 0 THEN 'PASS' ELSE 'MISSING' END::TEXT,
        ('Found ' || agent_count || ' agents for this plan type')::TEXT;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        ('Plan: ' || plan_rec.key)::TEXT,
        'ERROR'::TEXT,
        ('Error checking agents: ' || SQLERRM)::TEXT;
    END;
  END LOOP;

  -- Test 5: Check active calls (should be 0)
  RETURN QUERY SELECT 
    'Active Calls'::TEXT,
    CASE WHEN (SELECT COUNT(*) FROM active_calls) = 0 THEN 'PASS' ELSE 'WARNING' END::TEXT,
    ('Found ' || (SELECT COUNT(*) FROM active_calls) || ' active calls')::TEXT;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION test_vapi_setup() TO service_role;
GRANT EXECUTE ON FUNCTION test_vapi_setup() TO postgres;

-- Add comment
COMMENT ON FUNCTION test_vapi_setup() IS 'Tests VAPI setup and returns status of all components';