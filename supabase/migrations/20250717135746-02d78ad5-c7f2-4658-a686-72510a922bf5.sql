-- Fix remaining database function security issues
-- Add SECURITY DEFINER SET search_path = '' to all remaining functions

-- Fix all functions that still need search_path security
CREATE OR REPLACE FUNCTION public.check_free_trial_cooldown()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.check_free_trial_cooldown(client_ip text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  -- Check if there's a free trial booking within the last 24 hours from the same IP
  RETURN EXISTS (
    SELECT 1 
    FROM public.bookings 
    WHERE user_ip = client_ip 
    AND pricing_tier = 'free_trial'
    AND created_at > NOW() - INTERVAL '24 hours'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_free_trial_eligibility(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
    last_trial TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the last free trial timestamp
    SELECT last_free_trial INTO last_trial
    FROM public.users
    WHERE id = user_id;

    -- If no previous trial, allow it
    IF last_trial IS NULL THEN
        RETURN TRUE;
    END IF;

    -- If last trial was more than 24 hours ago, allow it
    IF last_trial < NOW() - INTERVAL '24 hours' THEN
        RETURN TRUE;
    END IF;

    -- Otherwise, deny it
    RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_last_free_trial(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
    updated_rows INTEGER;
BEGIN
    -- First verify the user exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
        RAISE EXCEPTION 'User not found: %', user_id;
    END IF;

    -- Update the last_free_trial timestamp
    UPDATE public.users
    SET last_free_trial = NOW()
    WHERE id = user_id;

    -- Get the number of rows updated
    GET DIAGNOSTICS updated_rows = ROW_COUNT;

    -- If no rows were updated, raise an error
    IF updated_rows = 0 THEN
        RAISE EXCEPTION 'Failed to update last_free_trial for user: %', user_id;
    END IF;

    -- Log the update
    RAISE NOTICE 'Updated last_free_trial for user % to %', user_id, NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_user(p_name text, p_email text, p_phone text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  user_id UUID;
BEGIN
  INSERT INTO public.users (name, email, phone, created_at)
  VALUES (p_name, p_email, p_phone, NOW())
  ON CONFLICT (phone) 
  DO UPDATE SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email
  RETURNING id INTO user_id;
  
  RETURN user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_booking_with_user(p_user_name text, p_user_email text, p_user_phone text, p_plan_id integer, p_message text, p_call_duration integer DEFAULT 300)
RETURNS TABLE(booking_id uuid, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_user_id UUID;
  v_booking_id UUID;
BEGIN
  -- Atomically create or update user
  v_user_id := public.upsert_user(p_user_name, p_user_email, p_user_phone);
  
  -- Create booking
  INSERT INTO public.bookings (user_id, plan_id, message, call_duration, created_at)
  VALUES (v_user_id, p_plan_id, p_message, p_call_duration, NOW())
  RETURNING id INTO v_booking_id;
  
  -- Return both IDs
  RETURN QUERY SELECT v_booking_id, v_user_id;
END;
$function$;

-- Enable RLS on partitioned tables
ALTER TABLE public.call_events_default ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_events_y2025m04 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_events_y2025m05 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_events_y2025m06 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vapi_accounts_backup ENABLE ROW LEVEL SECURITY;

-- Add service role bypass for partitioned tables
CREATE POLICY "Service role bypass" ON public.call_events_default
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role bypass" ON public.call_events_y2025m04
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role bypass" ON public.call_events_y2025m05
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role bypass" ON public.call_events_y2025m06
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role bypass" ON public.vapi_accounts_backup
FOR ALL USING (auth.role() = 'service_role');