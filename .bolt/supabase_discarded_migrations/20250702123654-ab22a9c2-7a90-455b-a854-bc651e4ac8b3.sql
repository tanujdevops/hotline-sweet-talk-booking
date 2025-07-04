-- PHASE 1: CRITICAL FIXES
-- Reset all VAPI account call counts to 0 (fixes stuck accounts)
UPDATE vapi_accounts SET current_active_calls = 0 WHERE current_active_calls > 0;
UPDATE vapi_agents SET current_active_calls = 0 WHERE current_active_calls > 0;

-- Fix the get_vapi_api_key function to handle NULL vault_secret_name
CREATE OR REPLACE FUNCTION public.get_vapi_api_key(account_uuid uuid)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  secret_name TEXT;
  api_key TEXT;
  direct_key TEXT;
BEGIN
  -- Get both vault secret name and direct API key
  SELECT vault_secret_name, api_key INTO secret_name, direct_key
  FROM vapi_accounts
  WHERE id = account_uuid AND is_active = true;
  
  IF secret_name IS NULL AND direct_key IS NULL THEN
    RAISE EXCEPTION 'No API key found for account %', account_uuid;
  END IF;
  
  -- If we have a vault secret, try to use it
  IF secret_name IS NOT NULL THEN
    BEGIN
      SELECT decrypted_secret INTO api_key
      FROM vault.decrypted_secrets
      WHERE name = secret_name;
      
      IF api_key IS NOT NULL THEN
        RETURN api_key;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Vault failed, fall back to direct key
      NULL;
    END;
  END IF;
  
  -- Use direct API key as fallback
  IF direct_key IS NOT NULL AND direct_key != '[ENCRYPTED]' THEN
    RETURN direct_key;
  END IF;
  
  RAISE EXCEPTION 'Failed to retrieve API key for account %', account_uuid;
END;
$function$;

-- Improve increment_call_count function with better error handling
CREATE OR REPLACE FUNCTION public.increment_call_count(agent_uuid uuid, account_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
  agent_current_calls INTEGER;
  agent_max_calls INTEGER;
  account_current_calls INTEGER;
  account_max_calls INTEGER;
  agent_updated BOOLEAN := false;
  account_updated BOOLEAN := false;
BEGIN
  -- Get current and max call counts with FOR UPDATE to lock rows
  SELECT current_active_calls, max_concurrent_calls 
  INTO agent_current_calls, agent_max_calls
  FROM public.vapi_agents
  WHERE id = agent_uuid AND is_active = true
  FOR UPDATE;
  
  SELECT current_active_calls, max_concurrent_calls 
  INTO account_current_calls, account_max_calls
  FROM public.vapi_accounts
  WHERE id = account_uuid AND is_active = true
  FOR UPDATE;
  
  -- Check if we found both records
  IF agent_current_calls IS NULL OR account_current_calls IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if incrementing would exceed limits
  IF agent_current_calls >= agent_max_calls OR account_current_calls >= account_max_calls THEN
    RETURN false;
  END IF;
  
  -- Increment agent call count
  UPDATE public.vapi_agents 
  SET current_active_calls = current_active_calls + 1,
      updated_at = now()
  WHERE id = agent_uuid;
  
  GET DIAGNOSTICS agent_updated = ROW_COUNT;
  
  -- Increment account call count
  UPDATE public.vapi_accounts 
  SET current_active_calls = current_active_calls + 1,
      updated_at = now()
  WHERE id = account_uuid;
  
  GET DIAGNOSTICS account_updated = ROW_COUNT;
  
  -- Ensure both updates succeeded
  RETURN agent_updated AND account_updated;
END;
$function$;

-- Improve decrement_call_count function with better consistency
CREATE OR REPLACE FUNCTION public.decrement_call_count(agent_uuid uuid, account_uuid uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Decrement call counts with row locking and ensure non-negative values
  UPDATE public.vapi_agents 
  SET current_active_calls = GREATEST(0, current_active_calls - 1),
      updated_at = now()
  WHERE id = agent_uuid;
  
  UPDATE public.vapi_accounts 
  SET current_active_calls = GREATEST(0, current_active_calls - 1),
      updated_at = now()
  WHERE id = account_uuid;
END;
$function$;

-- PHASE 2: CLEANUP UNUSED FUNCTIONS
-- Remove all test functions
DROP FUNCTION IF EXISTS public.test_agent_availability();
DROP FUNCTION IF EXISTS public.test_agent_availability_view();
DROP FUNCTION IF EXISTS public.test_agent_availability_safe();
DROP FUNCTION IF EXISTS public.test_vapi_setup();
DROP FUNCTION IF EXISTS public.test_vapi_setup_safe();
DROP FUNCTION IF EXISTS public.test_vapi_vault_setup();

-- Remove all HTTP functions (unused)
DROP FUNCTION IF EXISTS public.http(http_request);
DROP FUNCTION IF EXISTS public.http_get(character varying);
DROP FUNCTION IF EXISTS public.http_get(character varying, jsonb);
DROP FUNCTION IF EXISTS public.http_post(character varying, character varying, character varying);
DROP FUNCTION IF EXISTS public.http_post(character varying, jsonb);
DROP FUNCTION IF EXISTS public.http_put(character varying, character varying, character varying);
DROP FUNCTION IF EXISTS public.http_patch(character varying, character varying, character varying);
DROP FUNCTION IF EXISTS public.http_delete(character varying);
DROP FUNCTION IF EXISTS public.http_delete(character varying, character varying, character varying);
DROP FUNCTION IF EXISTS public.http_head(character varying);
DROP FUNCTION IF EXISTS public.http_header(character varying, character varying);
DROP FUNCTION IF EXISTS public.http_set_curlopt(character varying, character varying);
DROP FUNCTION IF EXISTS public.http_reset_curlopt();
DROP FUNCTION IF EXISTS public.http_list_curlopt();
DROP FUNCTION IF EXISTS public.urlencode(character varying);
DROP FUNCTION IF EXISTS public.urlencode(bytea);
DROP FUNCTION IF EXISTS public.urlencode(jsonb);
DROP FUNCTION IF EXISTS public.text_to_bytea(text);
DROP FUNCTION IF EXISTS public.bytea_to_text(bytea);

-- Remove unused utility functions
DROP FUNCTION IF EXISTS public.validate_free_trial();
DROP FUNCTION IF EXISTS public.validate_booking_tier();
DROP FUNCTION IF EXISTS public.set_booking_id();
DROP FUNCTION IF EXISTS public.generate_booking_id();
DROP FUNCTION IF EXISTS public.migrate_api_keys_to_vault();
DROP FUNCTION IF EXISTS public.sync_booking_payment_status();
DROP FUNCTION IF EXISTS public.get_available_agent_direct(text);

-- PHASE 3: CLEANUP UNUSED TABLES
-- Drop backup table
DROP TABLE IF EXISTS public.vapi_accounts_backup;

-- Drop unused payments table
DROP TABLE IF EXISTS public.payments;

-- Drop partitioned call_events tables (keep main one)
DROP TABLE IF EXISTS public.call_events_default;
DROP TABLE IF EXISTS public.call_events_y2025m04;
DROP TABLE IF EXISTS public.call_events_y2025m05;
DROP TABLE IF EXISTS public.call_events_y2025m06;

-- PHASE 4: OPTIMIZE CORE FUNCTIONS
-- Improve cleanup_inactive_call with better error handling
CREATE OR REPLACE FUNCTION public.cleanup_inactive_call(p_booking_id uuid, p_status text, p_error_message text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_agent_id UUID;
  v_account_id UUID;
  v_rows_affected INTEGER;
BEGIN
  -- Get the agent and account IDs before deleting the active call
  SELECT vapi_agent_id, vapi_account_id INTO v_agent_id, v_account_id
  FROM public.active_calls
  WHERE booking_id = p_booking_id;

  -- Delete the active call
  DELETE FROM public.active_calls
  WHERE booking_id = p_booking_id;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  -- Update the booking status
  UPDATE public.bookings
  SET status = p_status::booking_status,
      error_message = p_error_message
  WHERE id = p_booking_id;

  -- Decrement call counts only if we actually deleted an active call
  IF v_rows_affected > 0 AND v_agent_id IS NOT NULL AND v_account_id IS NOT NULL THEN
    PERFORM public.decrement_call_count(v_agent_id, v_account_id);
  END IF;
END;
$function$;

-- Fix get_available_agent to use the improved get_vapi_api_key
CREATE OR REPLACE FUNCTION public.get_available_agent(plan_type_param text)
RETURNS TABLE(agent_id uuid, vapi_agent_id uuid, account_id uuid, api_key text, phone_number_id uuid)
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Clean up any stuck calls (calls that have been active for more than 2 hours)
  UPDATE vapi_agents va
  SET current_active_calls = (
    SELECT COUNT(*) 
    FROM active_calls ac 
    WHERE ac.vapi_agent_id = va.id 
    AND ac.started_at > NOW() - INTERVAL '2 hours'
  )
  WHERE va.agent_type = plan_type_param;

  -- Return available agents with API keys from the improved function
  RETURN QUERY
  SELECT 
    va.agent_id,
    va.id as vapi_agent_id,
    vac.id as account_id,
    public.get_vapi_api_key(vac.id) as api_key,
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
$function$;