
-- Create table for VAPI accounts
CREATE TABLE public.vapi_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  phone_number_id UUID,
  max_concurrent_calls INTEGER NOT NULL DEFAULT 10,
  current_active_calls INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for VAPI agents
CREATE TABLE public.vapi_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vapi_account_id UUID REFERENCES public.vapi_accounts(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID NOT NULL, -- VAPI's agent ID
  agent_type TEXT NOT NULL CHECK (agent_type IN ('free_trial', 'standard', 'extended', 'premium')),
  max_concurrent_calls INTEGER NOT NULL DEFAULT 10,
  current_active_calls INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1, -- Lower number = higher priority
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for call queue
CREATE TABLE public.call_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1, -- Lower number = higher priority
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'assigned', 'failed')),
  assigned_agent_id UUID REFERENCES public.vapi_agents(id),
  assigned_account_id UUID REFERENCES public.vapi_accounts(id),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Update active_calls table to include agent and account info
ALTER TABLE public.active_calls 
ADD COLUMN vapi_agent_id UUID REFERENCES public.vapi_agents(id),
ADD COLUMN vapi_account_id UUID REFERENCES public.vapi_accounts(id);

-- Add indexes for performance
CREATE INDEX idx_vapi_agents_type_active ON public.vapi_agents(agent_type, is_active);
CREATE INDEX idx_vapi_agents_calls ON public.vapi_agents(current_active_calls, max_concurrent_calls);
CREATE INDEX idx_vapi_accounts_calls ON public.vapi_accounts(current_active_calls, max_concurrent_calls);
CREATE INDEX idx_call_queue_status_priority ON public.call_queue(status, priority, created_at);
CREATE INDEX idx_call_queue_plan_type ON public.call_queue(plan_type, status);

-- Function to get available agent for a plan type
CREATE OR REPLACE FUNCTION public.get_available_agent(plan_type_param TEXT)
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
  RETURN QUERY
  SELECT 
    va.agent_id,
    va.id as vapi_agent_id,
    vac.id as account_id,
    vac.api_key,
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

-- Function to increment call count
CREATE OR REPLACE FUNCTION public.increment_call_count(agent_uuid UUID, account_uuid UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.vapi_agents 
  SET current_active_calls = current_active_calls + 1,
      updated_at = now()
  WHERE id = agent_uuid;
  
  UPDATE public.vapi_accounts 
  SET current_active_calls = current_active_calls + 1,
      updated_at = now()
  WHERE id = account_uuid;
END;
$$;

-- Function to decrement call count
CREATE OR REPLACE FUNCTION public.decrement_call_count(agent_uuid UUID, account_uuid UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.vapi_agents 
  SET current_active_calls = GREATEST(0, current_active_calls - 1),
      updated_at = now()
  WHERE id = agent_uuid;
  
  UPDATE public.vapi_accounts 
  SET current_active_calls = GREATEST(0, current_active_calls - 1),
      updated_at = now()
  WHERE id = account_uuid;
END;
$$;

-- Trigger to automatically update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vapi_accounts_updated_at BEFORE UPDATE ON public.vapi_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vapi_agents_updated_at BEFORE UPDATE ON public.vapi_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_call_queue_updated_at BEFORE UPDATE ON public.call_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
