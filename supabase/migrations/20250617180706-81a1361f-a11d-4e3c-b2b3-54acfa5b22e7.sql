-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

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

-- Add call_duration to bookings table
ALTER TABLE public.bookings
ADD COLUMN call_duration INTEGER NOT NULL DEFAULT 300; -- Default 5 minutes (300 seconds)

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

-- Function to cleanup inactive call
CREATE OR REPLACE FUNCTION public.cleanup_inactive_call(
  p_booking_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_agent_id UUID;
  v_account_id UUID;
BEGIN
  -- Get the agent and account IDs before deleting the active call
  SELECT vapi_agent_id, vapi_account_id INTO v_agent_id, v_account_id
  FROM public.active_calls
  WHERE booking_id = p_booking_id;

  -- Delete the active call
  DELETE FROM public.active_calls
  WHERE booking_id = p_booking_id;

  -- Update the booking status
  UPDATE public.bookings
  SET status = p_status,
      error_message = p_error_message,
      updated_at = now()
  WHERE id = p_booking_id;

  -- Decrement call counts if we have agent and account IDs
  IF v_agent_id IS NOT NULL AND v_account_id IS NOT NULL THEN
    PERFORM public.decrement_call_count(v_agent_id, v_account_id);
  END IF;
END;
$$;

-- Function to check and update call durations
CREATE OR REPLACE FUNCTION public.check_call_durations()
RETURNS TABLE(
  booking_id UUID,
  status TEXT,
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking RECORD;
  v_agent_id UUID;
  v_account_id UUID;
BEGIN
  -- Find all active calls that have exceeded their duration
  FOR v_booking IN (
    SELECT 
      ac.booking_id,
      ac.vapi_agent_id,
      ac.vapi_account_id,
      b.call_duration,
      EXTRACT(EPOCH FROM (now() - ac.started_at)) as elapsed_seconds
    FROM public.active_calls ac
    JOIN public.bookings b ON b.id = ac.booking_id
    WHERE b.status = 'calling'
  ) LOOP
    -- If call has exceeded its duration
    IF v_booking.elapsed_seconds >= v_booking.call_duration THEN
      -- Cleanup the call
      PERFORM public.cleanup_inactive_call(
        v_booking.booking_id,
        'completed',
        'Call completed successfully'
      );
      
      -- Return the result
      booking_id := v_booking.booking_id;
      status := 'completed';
      message := 'Call completed successfully';
      RETURN NEXT;
    END IF;
  END LOOP;
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

-- Set up cron job to process call queue every minute
SELECT cron.schedule(
  'process-call-queue', -- job name
  '* * * * *',         -- every minute
  $$
  SELECT net.http_post(
    url := 'https://emtwxyywgszhboxpaunk.supabase.co/functions/v1/process-call-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtdHd4eXl3Z3N6aGJveHBhdW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDcyNDQ5NSwiZXhwIjoyMDYwMzAwNDk1fQ.usk0IgWMWID53_A_bE0D1DpHdIAL2plgjORLRzGi-EM'
    )
  ) AS request_id;
  $$
);

-- Function to automatically add booking to call queue
CREATE OR REPLACE FUNCTION public.add_booking_to_queue()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add to queue if status is 'pending' or 'queued'
  IF NEW.status IN ('pending', 'queued') THEN
    -- Get plan type from plans table
    DECLARE
      v_plan_type TEXT;
      v_existing_queue_id UUID;
    BEGIN
      -- Check if booking is already in queue
      SELECT id INTO v_existing_queue_id
      FROM public.call_queue
      WHERE booking_id = NEW.id
      AND status IN ('queued', 'processing');

      -- Only add to queue if not already there
      IF v_existing_queue_id IS NULL THEN
        SELECT key INTO v_plan_type
        FROM public.plans
        WHERE id = NEW.plan_id;

        -- Insert into call queue
        INSERT INTO public.call_queue (
          booking_id,
          plan_type,
          priority,
          status,
          scheduled_for
        ) VALUES (
          NEW.id,
          v_plan_type,
          CASE WHEN v_plan_type = 'free-trial' THEN 2 ELSE 1 END, -- Lower priority for free trials
          'queued',
          now()
        );
      END IF;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically add bookings to queue
DROP TRIGGER IF EXISTS add_booking_to_queue_trigger ON public.bookings;
CREATE TRIGGER add_booking_to_queue_trigger
  AFTER INSERT OR UPDATE OF status
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.add_booking_to_queue();
