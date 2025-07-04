-- Test script to verify VAPI vault setup is working correctly
-- Run this in your Supabase SQL Editor after applying the migrations

-- Test 1: Check if vault secrets exist
SELECT 
  name,
  created_at,
  updated_at
FROM vault.secrets 
WHERE name LIKE 'vapi_production_key_%'
ORDER BY created_at DESC;

-- Test 2: Check VAPI accounts setup
SELECT 
  id,
  name,
  vault_secret_name,
  phone_number_id,
  max_concurrent_calls,
  current_active_calls,
  is_active
FROM public.vapi_accounts
WHERE is_active = true
ORDER BY name;

-- Test 3: Check VAPI agents setup
SELECT 
  va.id,
  va.agent_id,
  va.agent_type,
  va.max_concurrent_calls,
  va.current_active_calls,
  va.is_active,
  va.priority,
  vac.name as account_name
FROM public.vapi_agents va
JOIN public.vapi_accounts vac ON va.vapi_account_id = vac.id
WHERE va.is_active = true
ORDER BY va.agent_type, va.priority;

-- Test 4: Check plans have assistant IDs
SELECT 
  key,
  vapi_assistant_id,
  price_cents,
  duration_seconds
FROM public.plans
ORDER BY key;

-- Test 5: Test vault key retrieval (this will show if decryption works)
SELECT * FROM test_vapi_vault_setup();

-- Test 6: Test get_available_agent function for each plan type
SELECT 'free_trial' as plan_type, * FROM get_available_agent('free_trial')
UNION ALL
SELECT 'standard' as plan_type, * FROM get_available_agent('standard')
UNION ALL
SELECT 'extended' as plan_type, * FROM get_available_agent('extended');

-- Test 7: Verify no old problematic data exists
SELECT 
  COUNT(*) as active_calls_count,
  'Should be 0' as expected
FROM public.active_calls;

-- Test 8: Check if any agents have non-zero call counts (should all be 0)
SELECT 
  agent_type,
  SUM(current_active_calls) as total_active_calls,
  'Should be 0' as expected
FROM public.vapi_agents
WHERE is_active = true
GROUP BY agent_type;