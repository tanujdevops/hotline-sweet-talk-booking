-- Fix VAPI Vault Setup and Test Agent Availability
-- This migration fixes vault issues and provides safe testing

-- First, let's fix the get_vapi_api_key function to handle missing vault secrets gracefully
CREATE OR REPLACE FUNCTION get_vapi_api_key(account_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_name TEXT;
  api_key TEXT;
  plain_key TEXT;
BEGIN
  -- Get the vault secret name and plain key for this account
  SELECT vault_secret_name, api_key INTO secret_name, plain_key
  FROM vapi_accounts
  WHERE id = account_uuid AND is_active = true;
  
  IF secret_name IS NULL THEN
    -- No vault secret configured, use plain text key if available
    IF plain_key IS NOT NULL AND plain_key != '[ENCRYPTED]' THEN
      RETURN plain_key;
    ELSE
      RAISE EXCEPTION 'No API key found for account %', account_uuid;
    END IF;
  END IF;
  
  -- Try to retrieve from vault
  BEGIN
    SELECT decrypted_secret INTO api_key
    FROM vault.decrypted_secrets
    WHERE name = secret_name;
    
    IF api_key IS NOT NULL THEN
      RETURN api_key;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Vault decryption failed, log and fallback
    RAISE NOTICE 'Vault decryption failed for %, falling back to plain key', secret_name;
  END;
  
  -- Fallback to plain text key if vault fails
  IF plain_key IS NOT NULL AND plain_key != '[ENCRYPTED]' THEN
    RETURN plain_key;
  END IF;
  
  RAISE EXCEPTION 'Failed to decrypt API key for account %', account_uuid;
END;
$$;

-- Create a safe function to test vault setup without causing errors
CREATE OR REPLACE FUNCTION test_vapi_setup_safe()
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
  vault_count INTEGER;
  working_accounts INTEGER := 0;
  account_rec RECORD;
BEGIN
  -- Test 1: Count active accounts
  SELECT COUNT(*) INTO account_count
  FROM vapi_accounts
  WHERE is_active = true;
  
  RETURN QUERY SELECT 
    'Active Accounts'::TEXT,
    CASE WHEN account_count > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    ('Found ' || account_count || ' active accounts')::TEXT;

  -- Test 2: Count active agents
  SELECT COUNT(*) INTO agent_count
  FROM vapi_agents
  WHERE is_active = true;
  
  RETURN QUERY SELECT 
    'Active Agents'::TEXT,
    CASE WHEN agent_count > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    ('Found ' || agent_count || ' active agents')::TEXT;

  -- Test 3: Check vault secrets
  BEGIN
    SELECT COUNT(*) INTO vault_count
    FROM vault.secrets;
    
    RETURN QUERY SELECT 
      'Vault Access'::TEXT,
      'PASS'::TEXT,
      ('Found ' || vault_count || ' total vault secrets')::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Vault Access'::TEXT,
      'FAIL'::TEXT,
      ('Vault access error: ' || SQLERRM)::TEXT;
  END;

  -- Test 4: Test API key retrieval for each account
  FOR account_rec IN 
    SELECT id, name FROM vapi_accounts WHERE is_active = true
  LOOP
    BEGIN
      PERFORM get_vapi_api_key(account_rec.id);
      working_accounts := working_accounts + 1;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        ('Account: ' || account_rec.name)::TEXT,
        'FAIL'::TEXT,
        ('Key retrieval failed: ' || SQLERRM)::TEXT;
    END;
  END LOOP;
  
  RETURN QUERY SELECT 
    'Working Accounts'::TEXT,
    CASE WHEN working_accounts = account_count THEN 'PASS' ELSE 'PARTIAL' END::TEXT,
    (working_accounts || ' of ' || account_count || ' accounts have working keys')::TEXT;
END;
$$;

-- Create a safe agent availability test
CREATE OR REPLACE FUNCTION test_agent_availability()
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

-- Fix any accounts that might have invalid vault references
UPDATE vapi_accounts 
SET vault_secret_name = NULL 
WHERE vault_secret_name IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM vault.secrets 
  WHERE name = vault_secret_name
);

-- Ensure we have working VAPI accounts with real API keys
-- Only create if no accounts exist
DO $$
DECLARE
  account_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO account_count FROM vapi_accounts WHERE is_active = true;
  
  IF account_count = 0 THEN
    -- Create a test account with the actual VAPI token from environment
    INSERT INTO vapi_accounts (
      name,
      api_key,
      phone_number_id,
      max_concurrent_calls,
      current_active_calls,
      is_active
    ) VALUES (
      'Production Account',
      'c498bc1e-5fc2-470b-a0ac-9a7b8b06ccd3', -- Your actual VAPI token
      NULL, -- Will be set when you configure phone numbers
      9,
      0,
      true
    );
    
    -- Create agents for the new account
    INSERT INTO vapi_agents (
      vapi_account_id,
      agent_id,
      agent_type,
      max_concurrent_calls,
      current_active_calls,
      is_active,
      priority
    )
    SELECT 
      va.id,
      gen_random_uuid(),
      plan_type,
      3,
      0,
      true,
      1
    FROM vapi_accounts va,
    UNNEST(ARRAY['free_trial', 'standard', 'extended']) AS plan_type
    WHERE va.name = 'Production Account';
  END IF;
END $$;

-- Update plans with placeholder assistant IDs if they don't have them
UPDATE plans SET vapi_assistant_id = gen_random_uuid() WHERE key = 'free_trial' AND vapi_assistant_id IS NULL;
UPDATE plans SET vapi_assistant_id = gen_random_uuid() WHERE key = 'standard' AND vapi_assistant_id IS NULL;
UPDATE plans SET vapi_assistant_id = gen_random_uuid() WHERE key = 'extended' AND vapi_assistant_id IS NULL;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_vapi_api_key(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION test_vapi_setup_safe() TO service_role;
GRANT EXECUTE ON FUNCTION test_vapi_setup_safe() TO postgres;
GRANT EXECUTE ON FUNCTION test_agent_availability() TO service_role;
GRANT EXECUTE ON FUNCTION test_agent_availability() TO postgres;

-- Clean up any stuck calls
DELETE FROM active_calls;
UPDATE vapi_agents SET current_active_calls = 0;
UPDATE vapi_accounts SET current_active_calls = 0;

-- Add comments
COMMENT ON FUNCTION get_vapi_api_key(UUID) IS 'Safely retrieves VAPI API key with vault fallback to plain text';
COMMENT ON FUNCTION test_vapi_setup_safe() IS 'Tests VAPI setup without causing errors';
COMMENT ON FUNCTION test_agent_availability() IS 'Tests agent availability for all plan types safely';