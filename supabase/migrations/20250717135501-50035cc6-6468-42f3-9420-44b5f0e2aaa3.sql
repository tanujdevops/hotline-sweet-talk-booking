-- Phase 1: Critical Security Fixes
-- 1.1 Enable RLS on All Tables

-- Enable RLS on all tables that don't have it
ALTER TABLE public.active_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vapi_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vapi_agents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users  
FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for bookings table
CREATE POLICY "Users can view their own bookings" ON public.bookings
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings" ON public.bookings
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" ON public.bookings
FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for payments table
CREATE POLICY "Users can view their own payments" ON public.payments
FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM public.bookings WHERE id = booking_id)
);

-- Plans table should be readable by everyone (public pricing)
CREATE POLICY "Plans are viewable by everyone" ON public.plans
FOR SELECT USING (true);

-- Service role bypass for all tables
CREATE POLICY "Service role bypass" ON public.active_calls
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role bypass" ON public.bookings
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role bypass" ON public.call_events
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role bypass" ON public.call_queue
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role bypass" ON public.payments
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role bypass" ON public.users
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role bypass" ON public.vapi_accounts
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role bypass" ON public.vapi_agents
FOR ALL USING (auth.role() = 'service_role');

-- 1.2 Fix Database Function Security - Add SECURITY DEFINER and search_path
CREATE OR REPLACE FUNCTION public.get_available_agent(plan_type_param text)
RETURNS TABLE(agent_id uuid, vapi_agent_id uuid, account_id uuid, api_key text, phone_number_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  -- Updated logic to properly handle single account with 9-call limit
  -- Get the single active account
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
    -- Check total account calls, not individual agent calls
    AND vac.current_active_calls < vac.max_concurrent_calls
  ORDER BY va.priority ASC
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_call_count(agent_uuid uuid, account_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  account_current_calls INTEGER;
  account_max_calls INTEGER;
BEGIN
  -- Get current and max call counts with FOR UPDATE to lock rows
  SELECT current_active_calls, max_concurrent_calls 
  INTO account_current_calls, account_max_calls
  FROM public.vapi_accounts
  WHERE id = account_uuid
  FOR UPDATE;
  
  -- Check if incrementing would exceed ACCOUNT limits (9 calls total)
  IF account_current_calls >= account_max_calls THEN
    RETURN false;
  END IF;
  
  -- Only increment account call count (not individual agent)
  UPDATE public.vapi_accounts 
  SET current_active_calls = current_active_calls + 1,
      updated_at = now()
  WHERE id = account_uuid;
  
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrement_call_count(agent_uuid uuid, account_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  -- Only decrement account call count (not individual agent)
  UPDATE public.vapi_accounts 
  SET current_active_calls = GREATEST(0, current_active_calls - 1),
      updated_at = now()
  WHERE id = account_uuid;
END;
$function$;

-- 1.3 Fix VAPI Concurrency - Update max concurrent calls to 9
UPDATE public.vapi_accounts 
SET max_concurrent_calls = 9 
WHERE is_active = true;

-- Update agents to not track individual call counts (account handles it)
UPDATE public.vapi_agents 
SET current_active_calls = 0, max_concurrent_calls = 9
WHERE is_active = true;