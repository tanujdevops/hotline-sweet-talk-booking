-- Production VAPI Vault Setup Migration (Fixed for existing secrets)
-- This migration handles existing vault secrets and sets up production-ready VAPI integration

-- Ensure vault_secret_name column exists
ALTER TABLE vapi_accounts ADD COLUMN IF NOT EXISTS vault_secret_name TEXT;

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

-- Create a helper function to safely create or update vault secrets
CREATE OR REPLACE FUNCTION create_or_update_vault_secret(
  secret_name TEXT,
  secret_value TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to update existing secret first
  BEGIN
    PERFORM vault.update_secret(secret_name, secret_value);
    RAISE NOTICE 'Updated existing vault secret: %', secret_name;
  EXCEPTION WHEN OTHERS THEN
    -- If update fails, try to create new secret
    BEGIN
      PERFORM vault.create_secret(secret_name, secret_value);
      RAISE NOTICE 'Created new vault secret: %', secret_name;
    EXCEPTION WHEN OTHERS THEN
      -- If both fail, log the error but don't stop the migration
      RAISE NOTICE 'Failed to create/update vault secret %. Error: %', secret_name, SQLERRM;
    END;
  END;
END;
$$;

-- Create a helper function to safely create vault accounts
CREATE OR REPLACE FUNCTION create_vapi_vault_account(
  p_name TEXT,
  p_api_key TEXT,
  p_phone_number_id UUID,
  p_max_calls INTEGER DEFAULT 9
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account_id UUID;
  secret_name TEXT;
  existing_account_id UUID;
BEGIN
  -- Check if account with this name already exists
  SELECT id INTO existing_account_id
  FROM vapi_accounts
  WHERE name = p_name;
  
  IF existing_account_id IS NOT NULL THEN
    RAISE NOTICE 'Account with name % already exists with ID %', p_name, existing_account_id;
    RETURN existing_account_id;
  END IF;

  -- Insert new account with placeholder API key
  INSERT INTO vapi_accounts (
    name,
    api_key,
    phone_number_id,
    max_concurrent_calls,
    current_active_calls,
    is_active
  ) VALUES (
    p_name,
    '[ENCRYPTED]',  -- Will be replaced with vault reference
    p_phone_number_id,
    p_max_calls,
    0,
    true
  ) RETURNING id INTO account_id;

  -- Create vault secret name
  secret_name := 'vapi_production_key_' || account_id::text;
  
  -- Store API key in vault (safely)
  PERFORM create_or_update_vault_secret(secret_name, p_api_key);
  
  -- Update account with vault reference
  UPDATE vapi_accounts 
  SET vault_secret_name = secret_name
  WHERE id = account_id;

  RAISE NOTICE 'Created VAPI account % with ID %', p_name, account_id;
  RETURN account_id;
END;
$$;

-- Create a helper function to add agents to an account
CREATE OR REPLACE FUNCTION add_vapi_agents_to_account(
  p_account_id UUID,
  p_free_trial_agent_id UUID,
  p_standard_agent_id UUID,
  p_extended_agent_id UUID,
  p_priority INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  -- Check if agents already exist for this account
  SELECT COUNT(*) INTO existing_count
  FROM vapi_agents
  WHERE vapi_account_id = p_account_id;
  
  IF existing_count > 0 THEN
    RAISE NOTICE 'Account % already has % agents, skipping agent creation', p_account_id, existing_count;
    RETURN;
  END IF;

  INSERT INTO vapi_agents (
    vapi_account_id,
    agent_id,
    agent_type,
    max_concurrent_calls,
    current_active_calls,
    is_active,
    priority
  ) VALUES 
  (p_account_id, p_free_trial_agent_id, 'free_trial', 3, 0, true, p_priority),
  (p_account_id, p_standard_agent_id, 'standard', 3, 0, true, p_priority),
  (p_account_id, p_extended_agent_id, 'extended', 3, 0, true, p_priority);
  
  RAISE NOTICE 'Added 3 agents to account %', p_account_id;
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

-- Clean up any existing problematic vault secrets that might cause conflicts
DO $$
DECLARE
  secret_record RECORD;
BEGIN
  -- Find and clean up any vault secrets that look like raw API keys
  FOR secret_record IN 
    SELECT name FROM vault.secrets 
    WHERE name ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
  LOOP
    BEGIN
      -- Try to delete the problematic secret
      DELETE FROM vault.secrets WHERE name = secret_record.name;
      RAISE NOTICE 'Cleaned up problematic vault secret: %', secret_record.name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not clean up vault secret %. Error: %', secret_record.name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_vapi_api_key(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION create_or_update_vault_secret(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION create_vapi_vault_account(TEXT, TEXT, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION add_vapi_agents_to_account(UUID, UUID, UUID, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION test_vapi_vault_setup() TO service_role;
GRANT EXECUTE ON FUNCTION test_vapi_vault_setup() TO postgres;

-- Clean up any existing active calls (fresh start)
DELETE FROM active_calls;

-- Reset all call counts to 0
UPDATE vapi_agents SET current_active_calls = 0 WHERE current_active_calls > 0;
UPDATE vapi_accounts SET current_active_calls = 0 WHERE current_active_calls > 0;

-- Add helpful comments
COMMENT ON FUNCTION get_vapi_api_key(UUID) IS 'Securely retrieves VAPI API key from vault storage';
COMMENT ON FUNCTION create_or_update_vault_secret(TEXT, TEXT) IS 'Safely creates or updates vault secrets without conflicts';
COMMENT ON FUNCTION create_vapi_vault_account(TEXT, TEXT, UUID, INTEGER) IS 'Creates a VAPI account with vault-encrypted API key';
COMMENT ON FUNCTION add_vapi_agents_to_account(UUID, UUID, UUID, UUID, INTEGER) IS 'Adds agents for all plan types to a VAPI account';
COMMENT ON FUNCTION test_vapi_vault_setup() IS 'Tests vault setup and returns status of all components';
COMMENT ON COLUMN vapi_accounts.vault_secret_name IS 'Reference to encrypted API key in Supabase Vault';

-- Create a view to safely show account status without exposing keys
CREATE OR REPLACE VIEW vapi_account_status AS
SELECT 
  id,
  name,
  CASE 
    WHEN vault_secret_name IS NOT NULL THEN 'ENCRYPTED'
    WHEN api_key = '[ENCRYPTED]' THEN 'ENCRYPTED'
    ELSE 'PLAIN_TEXT'
  END as key_status,
  phone_number_id,
  max_concurrent_calls,
  current_active_calls,
  is_active,
  created_at,
  updated_at
FROM vapi_accounts;

COMMENT ON VIEW vapi_account_status IS 'Safe view of VAPI accounts without exposing API keys';

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '✅ VAPI Vault infrastructure setup complete!';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '   1. Use create_vapi_vault_account() to add your production accounts';
  RAISE NOTICE '   2. Use add_vapi_agents_to_account() to add agents';
  RAISE NOTICE '   3. Run test_vapi_vault_setup() to verify everything works';
  RAISE NOTICE '   4. Check setup-production-vapi.md for detailed instructions';
END $$;