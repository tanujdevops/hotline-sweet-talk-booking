/*
  # Update Production VAPI IDs
  
  This migration updates the VAPI agent IDs and assistant IDs with actual production values.
  Replace the placeholder UUIDs with your actual VAPI IDs.
*/

-- Update VAPI agent IDs with actual production values
-- You need to replace these UUIDs with your actual VAPI agent IDs from your VAPI dashboard

UPDATE public.vapi_agents 
SET agent_id = 'your-actual-free-trial-agent-uuid-here'
WHERE agent_type = 'free_trial' AND agent_id = 'free-trial-agent-1-uuid';

UPDATE public.vapi_agents 
SET agent_id = 'your-actual-standard-agent-uuid-here'
WHERE agent_type = 'standard' AND agent_id = 'standard-agent-1-uuid';

UPDATE public.vapi_agents 
SET agent_id = 'your-actual-extended-agent-uuid-here'
WHERE agent_type = 'extended' AND agent_id = 'extended-agent-1-uuid';

-- Update backup agents if you have them
UPDATE public.vapi_agents 
SET agent_id = 'your-actual-free-trial-backup-agent-uuid-here'
WHERE agent_type = 'free_trial' AND agent_id = 'free-trial-agent-2-uuid';

UPDATE public.vapi_agents 
SET agent_id = 'your-actual-standard-backup-agent-uuid-here'
WHERE agent_type = 'standard' AND agent_id = 'standard-agent-2-uuid';

UPDATE public.vapi_agents 
SET agent_id = 'your-actual-extended-backup-agent-uuid-here'
WHERE agent_type = 'extended' AND agent_id = 'extended-agent-2-uuid';

-- Update phone number IDs with actual production values
UPDATE public.vapi_accounts 
SET phone_number_id = 'your-actual-phone-number-uuid-1'
WHERE name = 'Production VAPI Account 1';

UPDATE public.vapi_accounts 
SET phone_number_id = 'your-actual-phone-number-uuid-2'
WHERE name = 'Production VAPI Account 2';

-- Update assistant IDs in plans with actual production values
UPDATE public.plans 
SET vapi_assistant_id = 'your-actual-free-trial-assistant-uuid'
WHERE key = 'free_trial';

UPDATE public.plans 
SET vapi_assistant_id = 'your-actual-standard-assistant-uuid'
WHERE key = 'standard';

UPDATE public.plans 
SET vapi_assistant_id = 'your-actual-extended-assistant-uuid'
WHERE key = 'extended';

-- Add a comment explaining what needs to be updated
COMMENT ON TABLE vapi_agents IS 'Remember to update agent_id values with actual VAPI agent UUIDs from your VAPI dashboard';
COMMENT ON TABLE vapi_accounts IS 'Remember to update phone_number_id values with actual VAPI phone number UUIDs';
COMMENT ON TABLE plans IS 'Remember to update vapi_assistant_id values with actual VAPI assistant UUIDs';