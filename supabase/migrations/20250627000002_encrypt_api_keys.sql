-- Encrypt API keys using Supabase Vault
-- This migration will move plain text API keys to encrypted storage

-- First, let's create a backup of existing API keys
CREATE TABLE IF NOT EXISTS vapi_accounts_backup AS
SELECT id, name, api_key, phone_number_id, max_concurrent_calls, current_active_calls, is_active, created_at, updated_at
FROM vapi_accounts;

-- Add a column to store vault secret names instead of plain text keys
ALTER TABLE vapi_accounts ADD COLUMN IF NOT EXISTS vault_secret_name TEXT;

-- Create a function to migrate existing API keys to vault
CREATE OR REPLACE FUNCTION migrate_api_keys_to_vault()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account_record RECORD;
  secret_name TEXT;
BEGIN
  -- Process each account
  FOR account_record IN SELECT id, api_key FROM vapi_accounts WHERE vault_secret_name IS NULL LOOP
    -- Generate a unique secret name
    secret_name := 'vapi_key_' || account_record.id::text;
    
    -- Store the API key in vault (this requires the vault extension)
    -- Note: In production, ensure vault.create_secret has proper permissions
    PERFORM vault.create_secret(secret_name, account_record.api_key);
    
    -- Update the account record with the vault secret name
    UPDATE vapi_accounts 
    SET vault_secret_name = secret_name,
        api_key = '[ENCRYPTED]' -- Replace with placeholder
    WHERE id = account_record.id;
    
  END LOOP;
  
  RAISE NOTICE 'Migrated API keys to vault for % accounts', 
    (SELECT COUNT(*) FROM vapi_accounts WHERE vault_secret_name IS NOT NULL);
END;
$$;

-- Create a secure function to retrieve API keys from vault
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

-- Update the get_available_agent function to use encrypted keys
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
    get_vapi_api_key(vac.id) as api_key, -- Use encrypted key retrieval
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_vapi_api_key(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION migrate_api_keys_to_vault() TO service_role;

-- Comments for documentation
COMMENT ON FUNCTION get_vapi_api_key(UUID) IS 'Securely retrieves VAPI API key from vault storage';
COMMENT ON FUNCTION migrate_api_keys_to_vault() IS 'One-time migration function to move API keys to vault';
COMMENT ON TABLE vapi_accounts_backup IS 'Backup of original vapi_accounts before encryption migration';

-- Note: The actual migration (calling migrate_api_keys_to_vault()) should be done manually
-- after ensuring the vault extension is properly configured in production