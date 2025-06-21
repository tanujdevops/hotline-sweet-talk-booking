-- Configure cron jobs for maintenance tasks
-- Requires pg_cron extension which should be enabled in earlier migration

-- Function to clean up stale calls (calls that have been active for too long)
CREATE OR REPLACE FUNCTION public.cleanup_stale_calls()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  stale_call RECORD;
  v_agent_id UUID;
  v_account_id UUID;
BEGIN
  -- Find calls that have been active for more than 15 minutes
  FOR stale_call IN 
    SELECT ac.booking_id, ac.vapi_agent_id, ac.vapi_account_id
    FROM public.active_calls ac
    WHERE ac.started_at < NOW() - INTERVAL '15 minutes'
  LOOP
    -- Log the cleanup
    INSERT INTO public.call_events (booking_id, event_type, details)
    VALUES (
      stale_call.booking_id, 
      'call_cleanup', 
      jsonb_build_object(
        'reason', 'stale_call_timeout',
        'cleanup_time', NOW()
      )
    );
    
    -- Cleanup the call
    PERFORM public.cleanup_inactive_call(
      stale_call.booking_id,
      'failed',
      'Call timed out - exceeded maximum duration'
    );
  END LOOP;
END;
$$;

-- Function to process queued calls
CREATE OR REPLACE FUNCTION public.process_queue_cron()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Call the process-call-queue edge function
  PERFORM net.http_post(
    url := 'https://emtwxyywgszhboxpaunk.supabase.co/functions/v1/process-call-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Function to check payment statuses and update bookings
CREATE OR REPLACE FUNCTION public.check_payments_cron()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  pending_booking RECORD;
BEGIN
  -- Find bookings that have been pending payment for more than 30 minutes
  FOR pending_booking IN 
    SELECT id 
    FROM public.bookings 
    WHERE status = 'pending_payment' 
    AND created_at < NOW() - INTERVAL '30 minutes'
    LIMIT 100
  LOOP
    -- Call the check-payment-status edge function
    PERFORM net.http_post(
      url := 'https://emtwxyywgszhboxpaunk.supabase.co/functions/v1/check-payment-status',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('bookingId', pending_booking.id)
    );
  END LOOP;
END;
$$;

-- Function to reset call counts in case of inconsistencies
CREATE OR REPLACE FUNCTION public.reset_call_counts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Reset agent call counts based on actual active calls
  UPDATE public.vapi_agents va
  SET current_active_calls = (
    SELECT COUNT(*)
    FROM public.active_calls ac
    WHERE ac.vapi_agent_id = va.id
  ),
  updated_at = NOW();
  
  -- Reset account call counts based on actual active calls
  UPDATE public.vapi_accounts vac
  SET current_active_calls = (
    SELECT COUNT(*)
    FROM public.active_calls ac
    WHERE ac.vapi_account_id = vac.id
  ),
  updated_at = NOW();
END;
$$;

-- Function to clean up old call events (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_events()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.call_events 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Schedule cron jobs
-- Note: These will only work if pg_cron extension is properly configured

-- Clean up stale calls every 5 minutes
SELECT cron.schedule(
  'cleanup-stale-calls',
  '*/5 * * * *',
  $$SELECT public.cleanup_stale_calls();$$
);

-- Process call queue every minute
SELECT cron.schedule(
  'process-call-queue',
  '* * * * *',
  $$SELECT public.process_queue_cron();$$
);

-- Check payment statuses every 10 minutes
SELECT cron.schedule(
  'check-payment-statuses',
  '*/10 * * * *',
  $$SELECT public.check_payments_cron();$$
);

-- Reset call counts every hour (safety measure)
SELECT cron.schedule(
  'reset-call-counts',
  '0 * * * *',
  $$SELECT public.reset_call_counts();$$
);

-- Clean up old events daily at 2 AM
SELECT cron.schedule(
  'cleanup-old-events',
  '0 2 * * *',
  $$SELECT public.cleanup_old_events();$$
);

-- Create partition for next month (run monthly)
SELECT cron.schedule(
  'create-call-events-partition',
  '0 0 1 * *',
  $$SELECT public.create_call_events_partition();$$
);