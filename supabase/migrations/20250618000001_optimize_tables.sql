-- Create call_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.call_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a temporary table for partitioning
CREATE TABLE public.call_events_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Create partitions for the last 3 months
CREATE TABLE public.call_events_y2025m06 PARTITION OF public.call_events_new
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE TABLE public.call_events_y2025m05 PARTITION OF public.call_events_new
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE public.call_events_y2025m04 PARTITION OF public.call_events_new
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

-- Copy existing data to the new partitioned table
INSERT INTO public.call_events_new (id, booking_id, event_type, details, created_at)
SELECT id, booking_id, event_type, details, created_at
FROM public.call_events;

-- Drop the old table and rename the new one
DROP TABLE public.call_events;
ALTER TABLE public.call_events_new RENAME TO call_events;

-- Add partitioning for active_calls table
CREATE TABLE public.active_calls_new (
  LIKE public.active_calls INCLUDING ALL
) PARTITION BY RANGE (started_at);

-- Create partitions for active calls
CREATE TABLE public.active_calls_current PARTITION OF public.active_calls_new
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Copy existing data to the new partitioned table
INSERT INTO public.active_calls_new
SELECT * FROM public.active_calls;

-- Drop the old table and rename the new one
DROP TABLE public.active_calls;
ALTER TABLE public.active_calls_new RENAME TO active_calls;

-- Add additional indexes for performance
CREATE INDEX idx_call_events_booking_id_created_at ON public.call_events(booking_id, created_at DESC);
CREATE INDEX idx_active_calls_vapi_call_id ON public.active_calls(vapi_call_id);
CREATE INDEX idx_active_calls_started_at ON public.active_calls(started_at DESC);
CREATE INDEX idx_bookings_status_created_at ON public.bookings(status, created_at DESC);

-- Add function to automatically create new partitions
CREATE OR REPLACE FUNCTION public.create_call_events_partition()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  partition_date DATE;
  partition_name TEXT;
BEGIN
  -- Create partition for next month
  partition_date := date_trunc('month', now() + interval '1 month');
  partition_name := 'call_events_y' || to_char(partition_date, 'YYYY') || 'm' || to_char(partition_date, 'MM');
  
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.call_events
     FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    partition_date,
    partition_date + interval '1 month'
  );
END;
$$;

-- Create a cron job to create new partitions
SELECT cron.schedule(
  'create-call-events-partition',
  '0 0 1 * *', -- Run at midnight on the first day of each month
  $$
  SELECT public.create_call_events_partition();
  $$
);

-- Add function to handle concurrent updates safely
CREATE OR REPLACE FUNCTION public.safe_increment_call_count(
  agent_uuid UUID,
  account_uuid UUID
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  agent_current_calls INTEGER;
  account_current_calls INTEGER;
BEGIN
  -- Get current call counts with FOR UPDATE to lock rows
  SELECT current_active_calls INTO agent_current_calls
  FROM public.vapi_agents
  WHERE id = agent_uuid
  FOR UPDATE;
  
  SELECT current_active_calls INTO account_current_calls
  FROM public.vapi_accounts
  WHERE id = account_uuid
  FOR UPDATE;
  
  -- Check if incrementing would exceed limits
  IF agent_current_calls >= (
    SELECT max_concurrent_calls 
    FROM public.vapi_agents 
    WHERE id = agent_uuid
  ) OR account_current_calls >= (
    SELECT max_concurrent_calls 
    FROM public.vapi_accounts 
    WHERE id = account_uuid
  ) THEN
    RETURN false;
  END IF;
  
  -- Increment call counts
  UPDATE public.vapi_agents 
  SET current_active_calls = current_active_calls + 1,
      updated_at = now()
  WHERE id = agent_uuid;
  
  UPDATE public.vapi_accounts 
  SET current_active_calls = current_active_calls + 1,
      updated_at = now()
  WHERE id = account_uuid;
  
  RETURN true;
END;
$$;

-- Add function to handle concurrent decrements safely
CREATE OR REPLACE FUNCTION public.safe_decrement_call_count(
  agent_uuid UUID,
  account_uuid UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Decrement call counts with row locking
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

-- Update cleanup_inactive_call to use safe decrement
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
    PERFORM public.safe_decrement_call_count(v_agent_id, v_account_id);
  END IF;
END;
$$; 