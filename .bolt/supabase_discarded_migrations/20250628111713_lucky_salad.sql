-- Production VAPI Vault Setup Migration
-- This migration sets up secure VAPI accounts and agents with vault-encrypted API keys

-- First, ensure we have the vault extension
-- Note: This should already be available in Supabase

-- Create the vault secret retrieval function
CREATE OR REPLACE FUNCTION get_vapi_api_key(account_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_name TEXT;
  api_key TEXT;
BEGIN
  -- Get the vault secret name for this account
  SELECT vault_secret_name INTO secret_name
  FROM vapi_accounts
  WHERE id = account_uuid AND is_active = true;
  
  IF secret_name IS NULL THEN
    RAISE EXCEPTION 'No vault secret found for account %', account_uuid;
  END IF;
  
  -- Retrieve the API key from vault
  SELECT decrypted_secret INTO api_key
  FROM vault.decrypted_secrets
  WHERE name = secret_name;
  
  IF api_key IS NULL THEN
    RAISE EXCEPTION 'Failed to decrypt API key for account %', account_uuid;
  END IF;
  
  RETURN api_key;
END;
$$;

-- Create a test function for vault setup verification
CREATE OR REPLACE FUNCTION test_vapi_vault_setup()
RETURNS TABLE(
  test_name TEXT,
  status TEXT,
  details TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  vault_count INTEGER;
  account_count INTEGER;
  agent_count INTEGER;
  test_account_id UUID;
  test_key TEXT;
BEGIN
  -- Test 1: Check vault secrets count
  SELECT COUNT(*) INTO vault_count
  FROM vault.secrets 
  WHERE name LIKE 'vapi_production_key_%';
  
  RETURN QUERY SELECT 
    'Vault Secrets'::TEXT,
    CASE WHEN vault_count > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    ('Found ' || vault_count || ' vault secrets')::TEXT;

  -- Test 2: Check active accounts
  SELECT COUNT(*) INTO account_count
  FROM vapi_accounts
  WHERE is_active = true AND vault_secret_name IS NOT NULL;
  
  RETURN QUERY SELECT 
    'Active Accounts'::TEXT,
    CASE WHEN account_count > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    ('Found ' || account_count || ' active accounts with vault keys')::TEXT;

  -- Test 3: Check active agents
  SELECT COUNT(*) INTO agent_count
  FROM vapi_agents
  WHERE is_active = true;
  
  RETURN QUERY SELECT 
    'Active Agents'::TEXT,
    CASE WHEN agent_count > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    ('Found ' || agent_count || ' active agents')::TEXT;

  -- Test 4: Try to decrypt a key (if accounts exist)
  IF account_count > 0 THEN
    BEGIN
      SELECT id INTO test_account_id
      FROM vapi_accounts
      WHERE is_active = true AND vault_secret_name IS NOT NULL
      LIMIT 1;
      
      SELECT get_vapi_api_key(test_account_id) INTO test_key;
      
      RETURN QUERY SELECT 
        'Key Decryption'::TEXT,
        CASE WHEN test_key IS NOT NULL AND length(test_key) > 10 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        ('Decrypted key length: ' || COALESCE(length(test_key), 0))::TEXT;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        'Key Decryption'::TEXT,
        'FAIL'::TEXT,
        ('Error: ' || SQLERRM)::TEXT;
    END;
  END IF;
END;
$$;

-- Update the get_available_agent function to use vault keys
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
  RETURN QUERY
  SELECT 
    va.agent_id,
    va.id as vapi_agent_id,
    vac.id as account_id,
    CASE 
      WHEN vac.vault_secret_name IS NOT NULL THEN get_vapi_api_key(vac.id)
      ELSE vac.api_key  -- Fallback to plain text for migration period
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

-- Add vault_secret_name column if it doesn't exist
ALTER TABLE vapi_accounts ADD COLUMN IF NOT EXISTS vault_secret_name TEXT;

-- Create production VAPI accounts with vault encryption
-- Note: Replace these with your actual VAPI credentials

-- Production Account 1 (Primary)
DO $$
DECLARE
  account_id UUID;
  secret_name TEXT;
BEGIN
  -- Insert account
  INSERT INTO vapi_accounts (
    name,
    api_key,
    phone_number_id,
    max_concurrent_calls,
    current_active_calls,
    is_active
  ) VALUES (
    'Production Primary',
    '[PLACEHOLDER_API_KEY_1]',  -- Replace with actual key
    '[PLACEHOLDER_PHONE_ID_1]'::UUID,  -- Replace with actual phone ID
    9,  -- Leave 1 call buffer
    0,
    true
  ) RETURNING id INTO account_id;

  -- Create vault secret
  secret_name := 'vapi_production_key_' || account_id::text;
  
  -- Store API key in vault (replace with actual key)
  PERFORM vault.create_secret(secret_name, '[PLACEHOLDER_API_KEY_1]');
  
  -- Update account with vault reference
  UPDATE vapi_accounts 
  SET vault_secret_name = secret_name,
      api_key = '[ENCRYPTED]'
  WHERE id = account_id;

  -- Create agents for this account
  INSERT INTO vapi_agents (
    vapi_account_id,
    agent_id,
    agent_type,
    max_concurrent_calls,
    current_active_calls,
    is_active,
    priority
  ) VALUES 
  (account_id, '[PLACEHOLDER_AGENT_ID_FREE]'::UUID, 'free_trial', 3, 0, true, 1),
  (account_id, '[PLACEHOLDER_AGENT_ID_STANDARD]'::UUID, 'standard', 3, 0, true, 1),
  (account_id, '[PLACEHOLDER_AGENT_ID_EXTENDED]'::UUID, 'extended', 3, 0, true, 1);
END $$;

-- Production Account 2 (Backup)
DO $$
DECLARE
  account_id UUID;
  secret_name TEXT;
BEGIN
  -- Insert account
  INSERT INTO vapi_accounts (
    name,
    api_key,
    phone_number_id,
    max_concurrent_calls,
    current_active_calls,
    is_active
  ) VALUES (
    'Production Backup',
    '[PLACEHOLDER_API_KEY_2]',  -- Replace with actual key
    '[PLACEHOLDER_PHONE_ID_2]'::UUID,  -- Replace with actual phone ID
    9,  -- Leave 1 call buffer
    0,
    true
  ) RETURNING id INTO account_id;

  -- Create vault secret
  secret_name := 'vapi_production_key_' || account_id::text;
  
  -- Store API key in vault (replace with actual key)
  PERFORM vault.create_secret(secret_name, '[PLACEHOLDER_API_KEY_2]');
  
  -- Update account with vault reference
  UPDATE vapi_accounts 
  SET vault_secret_name = secret_name,
      api_key = '[ENCRYPTED]'
  WHERE id = account_id;

  -- Create agents for this account (lower priority as backup)
  INSERT INTO vapi_agents (
    vapi_account_id,
    agent_id,
    agent_type,
    max_concurrent_calls,
    current_active_calls,
    is_active,
    priority
  ) VALUES 
  (account_id, '[PLACEHOLDER_AGENT_ID_FREE_2]'::UUID, 'free_trial', 3, 0, true, 2),
  (account_id, '[PLACEHOLDER_AGENT_ID_STANDARD_2]'::UUID, 'standard', 3, 0, true, 2),
  (account_id, '[PLACEHOLDER_AGENT_ID_EXTENDED_2]'::UUID, 'extended', 3, 0, true, 2);
END $$;

-- Update plans with assistant IDs (replace with actual assistant IDs)
UPDATE plans SET vapi_assistant_id = '[PLACEHOLDER_ASSISTANT_FREE]'::UUID WHERE key = 'free_trial';
UPDATE plans SET vapi_assistant_id = '[PLACEHOLDER_ASSISTANT_STANDARD]'::UUID WHERE key = 'standard';
UPDATE plans SET vapi_assistant_id = '[PLACEHOLDER_ASSISTANT_EXTENDED]'::UUID WHERE key = 'extended';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_vapi_api_key(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION test_vapi_vault_setup() TO service_role;
GRANT EXECUTE ON FUNCTION test_vapi_vault_setup() TO postgres;

-- Clean up any existing active calls (fresh start)
DELETE FROM active_calls;

-- Reset all call counts to 0
UPDATE vapi_agents SET current_active_calls = 0;
UPDATE vapi_accounts SET current_active_calls = 0;

-- Add helpful comments
COMMENT ON FUNCTION get_vapi_api_key(UUID) IS 'Securely retrieves VAPI API key from vault storage';
COMMENT ON FUNCTION test_vapi_vault_setup() IS 'Tests vault setup and returns status of all components';
COMMENT ON COLUMN vapi_accounts.vault_secret_name IS 'Reference to encrypted API key in Supabase Vault';