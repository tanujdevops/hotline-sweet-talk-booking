-- Test VAPI Agent Availability
-- Run this in your Supabase SQL Editor to verify all plan types have available agents

-- Test 1: Check agent availability for each plan type
SELECT 
  'free_trial' as plan_type,
  CASE WHEN agent_id IS NOT NULL THEN 'AVAILABLE' ELSE 'NO_AGENT' END as status,
  agent_id,
  account_id,
  phone_number_id
FROM get_available_agent('free_trial')

UNION ALL

SELECT 
  'standard' as plan_type,
  CASE WHEN agent_id IS NOT NULL THEN 'AVAILABLE' ELSE 'NO_AGENT' END as status,
  agent_id,
  account_id,
  phone_number_id
FROM get_available_agent('standard')

UNION ALL

SELECT 
  'extended' as plan_type,
  CASE WHEN agent_id IS NOT NULL THEN 'AVAILABLE' ELSE 'NO_AGENT' END as status,
  agent_id,
  account_id,
  phone_number_id
FROM get_available_agent('extended');

-- Test 2: Check account status
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
  SUM(max_concurrent_calls) as total_capacity,
  SUM(current_active_calls) as current_usage
FROM vapi_agents 
WHERE is_active = true
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