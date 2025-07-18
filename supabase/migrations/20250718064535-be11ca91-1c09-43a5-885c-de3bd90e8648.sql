-- Phase 1: Clean up orphaned active call and fix critical issues
-- Remove the stuck active call for booking 82aefb99-9cce-4218-9e81-af4adbc882b0
DELETE FROM public.active_calls 
WHERE booking_id = '82aefb99-9cce-4218-9e81-af4adbc882b0';

-- Update the stuck booking status to completed
UPDATE public.bookings 
SET status = 'completed', 
    message = 'Call completed - cleaned up stuck call'
WHERE id = '82aefb99-9cce-4218-9e81-af4adbc882b0';

-- Phase 2: Security hardening - Add SET search_path = '' to functions that lack it
CREATE OR REPLACE FUNCTION public.check_free_trial_cooldown()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
    last_trial TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the last free trial timestamp for the current user
    SELECT last_free_trial INTO last_trial
    FROM public.users
    WHERE id = auth.uid();

    -- If no previous trial, no cooldown
    IF last_trial IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Return true if user has used a free trial in the last 24 hours
    RETURN last_trial > NOW() - INTERVAL '24 hours';
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_stale_calls()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  stale_call RECORD;
BEGIN
  -- Find calls that have been active for more than 15 minutes
  FOR stale_call IN 
    SELECT ac.booking_id, ac.vapi_agent_id, ac.vapi_account_id
    FROM public.active_calls ac
    WHERE ac.started_at < NOW() - INTERVAL '15 minutes'
  LOOP
    -- Cleanup the call
    PERFORM public.cleanup_inactive_call(
      stale_call.booking_id,
      'failed',
      'Call timed out - exceeded maximum duration'
    );
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_stale_queue()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Remove queue items for completed/cancelled bookings
  DELETE FROM public.call_queue 
  WHERE booking_id IN (
    SELECT id FROM public.bookings 
    WHERE status IN ('completed', 'cancelled', 'failed')
  );
  
  -- Remove very old failed queue items (older than 24 hours)
  DELETE FROM public.call_queue 
  WHERE status = 'failed' 
  AND created_at < NOW() - INTERVAL '24 hours';
  
  RAISE NOTICE 'Cleaned up stale queue items';
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_inactive_call(p_booking_id uuid, p_status text, p_error_message text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
  SET status = p_status::booking_status,
      error_message = p_error_message
  WHERE id = p_booking_id;

  -- Decrement call counts if we have agent and account IDs
  IF v_agent_id IS NOT NULL AND v_account_id IS NOT NULL THEN
    PERFORM public.decrement_call_count(v_agent_id, v_account_id);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.safe_decrement_call_count(agent_uuid uuid, account_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Update agent status
  UPDATE public.vapi_agents 
  SET current_active_calls = GREATEST(0, current_active_calls - 1),
      updated_at = now()
  WHERE id = agent_uuid;
  
  -- Update account status
  UPDATE public.vapi_accounts 
  SET current_active_calls = GREATEST(0, current_active_calls - 1),
      updated_at = now()
  WHERE id = account_uuid;
END;
$function$;

-- Phase 3: Add health check and monitoring functions
CREATE OR REPLACE FUNCTION public.detect_orphaned_calls()
 RETURNS TABLE(booking_id uuid, minutes_stuck integer, booking_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ac.booking_id,
    EXTRACT(EPOCH FROM (now() - ac.started_at))::integer / 60 as minutes_stuck,
    b.status::text as booking_status
  FROM public.active_calls ac
  JOIN public.bookings b ON b.id = ac.booking_id
  WHERE ac.started_at < NOW() - INTERVAL '10 minutes'
  ORDER BY ac.started_at ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_cleanup_orphaned_calls()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  orphaned_call RECORD;
  cleanup_count INTEGER := 0;
BEGIN
  -- Find and cleanup orphaned calls (active for more than 15 minutes)
  FOR orphaned_call IN 
    SELECT booking_id, vapi_agent_id, vapi_account_id
    FROM public.active_calls 
    WHERE started_at < NOW() - INTERVAL '15 minutes'
  LOOP
    -- Clean up the orphaned call
    PERFORM public.cleanup_inactive_call(
      orphaned_call.booking_id,
      'failed',
      'Auto-cleanup: Call exceeded maximum duration'
    );
    cleanup_count := cleanup_count + 1;
  END LOOP;
  
  -- Log the cleanup activity
  INSERT INTO public.call_events (
    event_type,
    details
  ) VALUES (
    'auto_cleanup',
    jsonb_build_object(
      'timestamp', now(),
      'cleaned_calls', cleanup_count,
      'message', 'Auto-cleanup completed'
    )
  );
  
  RAISE NOTICE 'Auto-cleanup completed: % orphaned calls cleaned', cleanup_count;
END;
$function$;