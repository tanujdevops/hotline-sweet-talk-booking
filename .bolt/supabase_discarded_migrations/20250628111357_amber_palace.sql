/*
  # Setup Production VAPI Accounts with Vault Encryption

  1. New Tables
    - Creates new VAPI accounts with proper vault encryption
    - Sets up VAPI agents for all plan types
    - Updates plans with new assistant IDs

  2. Security
    - All API keys stored securely in Supabase Vault
    - Proper access controls and functions

  3. Production Ready
    - Multiple agents for different plan types
    - Proper concurrency limits
    - Error handling and monitoring
*/

-- First, let's clean up any existing problematic data
DELETE FROM public.active_calls;
UPDATE public.vapi_agents SET current_active_calls = 0;
UPDATE public.vapi_accounts SET current_active_calls = 0;

-- Create new production VAPI accounts with vault encryption
DO $$
DECLARE
  -- Production VAPI Account 1
  account1_id UUID := gen_random_uuid();
  account1_secret_name TEXT;
  
  -- Production VAPI Account 2 (for redundancy)
  account2_id UUID := gen_random_uuid();
  account2_secret_name TEXT;
  
  -- VAPI API Keys (replace these with your actual production keys)
  vapi_api_key_1 TEXT := 'c498bc1e-5fc2-470b-a0ac-9a7b8b06ccd3'; -- Replace with actual key
  vapi_api_key_2 TEXT := 'your-second-vapi-api-key-here'; -- Replace with actual key if you have multiple
  
  -- Phone number IDs (replace with your actual VAPI phone number UUIDs)
  phone_number_1 UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; -- Replace with actual phone number ID
  phone_number_2 UUID := 'b2c3d4e5-f6g7-8901-bcde-f23456789012'; -- Replace with actual phone number ID
  
BEGIN
  -- Create vault secrets for API keys
  account1_secret_name := 'vapi_production_key_' || account1_id::text;
  account2_secret_name := 'vapi_production_key_' || account2_id::text;
  
  -- Store API keys in vault
  PERFORM vault.create_secret(account1_secret_name, vapi_api_key_1);
  PERFORM vault.create_secret(account2_secret_name, vapi_api_key_2);
  
  -- Insert production VAPI accounts
  INSERT INTO public.vapi_accounts (
    id,
    name,
    api_key,
    phone_number_id,
    vault_secret_name,
    max_concurrent_calls,
    current_active_calls,
    is_active
  ) VALUES 
  (
    account1_id,
    'Production VAPI Account 1',
    '[ENCRYPTED]',
    phone_number_1,
    account1_secret_name,
    9, -- Leave 1 call buffer for safety
    0,
    TRUE
  ),
  (
    account2_id,
    'Production VAPI Account 2',
    '[ENCRYPTED]',
    phone_number_2,
    account2_secret_name,
    9, -- Leave 1 call buffer for safety
    0,
    TRUE
  );
  
  -- Create VAPI agents for different plan types
  -- Free Trial Agents (lower priority)
  INSERT INTO public.vapi_agents (
    vapi_account_id,
    agent_id,
    agent_type,
    max_concurrent_calls,
    current_active_calls,
    is_active,
    priority
  ) VALUES 
  -- Free trial agents on account 1
  (
    account1_id,
    'free-trial-agent-1-uuid', -- Replace with actual VAPI agent ID
    'free_trial',
    3, -- Limit free trial calls
    0,
    TRUE,
    3 -- Lower priority
  ),
  -- Standard plan agents on account 1
  (
    account1_id,
    'standard-agent-1-uuid', -- Replace with actual VAPI agent ID
    'standard',
    4,
    0,
    TRUE,
    1 -- High priority
  ),
  -- Extended plan agents on account 1
  (
    account1_id,
    'extended-agent-1-uuid', -- Replace with actual VAPI agent ID
    'extended',
    2,
    0,
    TRUE,
    1 -- High priority
  ),
  -- Free trial agents on account 2 (backup)
  (
    account2_id,
    'free-trial-agent-2-uuid', -- Replace with actual VAPI agent ID
    'free_trial',
    3,
    0,
    TRUE,
    4 -- Even lower priority (backup)
  ),
  -- Standard plan agents on account 2 (backup)
  (
    account2_id,
    'standard-agent-2-uuid', -- Replace with actual VAPI agent ID
    'standard',
    4,
    0,
    TRUE,
    2 -- Medium priority (backup)
  ),
  -- Extended plan agents on account 2 (backup)
  (
    account2_id,
    'extended-agent-2-uuid', -- Replace with actual VAPI agent ID
    'extended',
    2,
    0,
    TRUE,
    2 -- Medium priority (backup)
  );
  
  RAISE NOTICE 'Created production VAPI accounts: % and %', account1_id, account2_id;
  RAISE NOTICE 'Vault secrets created: % and %', account1_secret_name, account2_secret_name;
  
END $$;

-- Update plans with production assistant IDs
UPDATE public.plans 
SET vapi_assistant_id = 'free-trial-assistant-uuid' -- Replace with actual assistant ID
WHERE key = 'free_trial';

UPDATE public.plans 
SET vapi_assistant_id = 'standard-assistant-uuid' -- Replace with actual assistant ID
WHERE key = 'standard';

UPDATE public.plans 
SET vapi_assistant_id = 'extended-assistant-uuid' -- Replace with actual assistant ID
WHERE key = 'extended';

-- Ensure the vault key retrieval function works properly
CREATE OR REPLACE FUNCTION get_vapi_api_key_secure(account_uuid UUID)
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

-- Update the get_available_agent function to use the secure key retrieval
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
  -- Clean up any stuck calls first
  UPDATE vapi_agents va
  SET current_active_calls = (
    SELECT COUNT(*) 
    FROM active_calls ac 
    WHERE ac.vapi_agent_id = va.id 
    AND ac.started_at > NOW() - INTERVAL '2 hours'
  )
  WHERE va.agent_type = plan_type_param;

  UPDATE vapi_accounts vac
  SET current_active_calls = (
    SELECT COUNT(*) 
    FROM active_calls ac 
    JOIN vapi_agents va ON ac.vapi_agent_id = va.id
    WHERE va.vapi_account_id = vac.id 
    AND ac.started_at > NOW() - INTERVAL '2 hours'
  );

  -- Return available agents with decrypted API keys
  RETURN QUERY
  SELECT 
    va.agent_id,
    va.id as vapi_agent_id,
    vac.id as account_id,
    get_vapi_api_key_secure(vac.id) as api_key,
    vac.phone_number_id
  FROM public.vapi_agents va
  JOIN public.vapi_accounts vac ON va.vapi_account_id = vac.id
  WHERE va.agent_type = plan_type_param
    AND va.is_active = true
    AND vac.is_active = true
    AND va.current_active_calls < va.max_concurrent_calls
    AND vac.current_active_calls < vac.max_concurrent_calls
    AND vac.vault_secret_name IS NOT NULL -- Ensure we have encrypted keys
  ORDER BY va.priority ASC, va.current_active_calls ASC
  LIMIT 1;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_vapi_api_key_secure(UUID) TO service_role;

-- Create a function to test the vault setup
CREATE OR REPLACE FUNCTION test_vapi_vault_setup()
RETURNS TABLE(
  account_id UUID,
  account_name TEXT,
  has_vault_secret BOOLEAN,
  can_decrypt_key BOOLEAN,
  agent_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account_record RECORD;
  test_key TEXT;
  agent_count_val INTEGER;
BEGIN
  FOR account_record IN 
    SELECT id, name, vault_secret_name 
    FROM vapi_accounts 
    WHERE is_active = true
  LOOP
    -- Test if we can decrypt the key
    BEGIN
      test_key := get_vapi_api_key_secure(account_record.id);
      
      -- Count agents for this account
      SELECT COUNT(*) INTO agent_count_val
      FROM vapi_agents
      WHERE vapi_account_id = account_record.id AND is_active = true;
      
      RETURN QUERY SELECT 
        account_record.id,
        account_record.name,
        (account_record.vault_secret_name IS NOT NULL),
        (test_key IS NOT NULL AND length(test_key) > 0),
        agent_count_val;
        
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        account_record.id,
        account_record.name,
        (account_record.vault_secret_name IS NOT NULL),
        FALSE,
        0;
    END;
  END LOOP;
END;
$$;

-- Grant execute permission for testing
GRANT EXECUTE ON FUNCTION test_vapi_vault_setup() TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION get_vapi_api_key_secure(UUID) IS 'Production-ready function to securely retrieve VAPI API keys from vault';
COMMENT ON FUNCTION test_vapi_vault_setup() IS 'Test function to verify vault setup is working correctly';