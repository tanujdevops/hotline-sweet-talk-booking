
-- Insert the VAPI account
INSERT INTO public.vapi_accounts (
  name,
  api_key,
  phone_number_id,
  max_concurrent_calls,
  current_active_calls,
  is_active
) VALUES (
  'Main VAPI Account',
  'c498bc1e-5fc2-470b-a0ac-9a7b8b06ccd3',
  'fa652ea8-6136-40ce-ae45-99f7298f9d79'::uuid,
  30, -- Assuming 10 calls per agent * 3 agents
  0,
  true
);

-- Insert the three agents (we'll reference the account ID using a subquery)
INSERT INTO public.vapi_agents (
  vapi_account_id,
  agent_id,
  agent_type,
  max_concurrent_calls,
  current_active_calls,
  is_active,
  priority
) VALUES 
-- Free Trial Agent
(
  (SELECT id FROM public.vapi_accounts WHERE api_key = 'c498bc1e-5fc2-470b-a0ac-9a7b8b06ccd3'),
  'e27edefa-42d3-4e40-8bc1-c33a88ee6e2f'::uuid,
  'free_trial',
  10,
  0,
  true,
  3 -- Lower priority for free trials
),
-- Standard Package Agent  
(
  (SELECT id FROM public.vapi_accounts WHERE api_key = 'c498bc1e-5fc2-470b-a0ac-9a7b8b06ccd3'),
  '528a948d-86a1-49f5-8f51-7caaa66bf5c5'::uuid,
  'standard',
  10,
  0,
  true,
  1 -- Higher priority for paid plans
),
-- Extended Package Agent
(
  (SELECT id FROM public.vapi_accounts WHERE api_key = 'c498bc1e-5fc2-470b-a0ac-9a7b8b06ccd3'),
  'b9390083-c079-4a9e-b6b0-1b5bb6b02823'::uuid,
  'extended',
  10,
  0,
  true,
  1 -- Higher priority for paid plans
);
