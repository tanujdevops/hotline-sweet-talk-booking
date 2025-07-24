-- Update free trial logic to be one-time per user (lifetime) instead of 24-hour cooldown
-- Run this SQL in Supabase SQL Editor

-- Update the eligibility check function to be lifetime restriction
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

    -- If no previous trial, allow it (first time user)
    IF last_trial IS NULL THEN
        RETURN TRUE;
    END IF;

    -- If user has already used free trial, deny it (lifetime restriction)
    RETURN FALSE;
END;
$function$;

-- Update the cooldown function to also reflect lifetime restriction
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

    -- If no previous trial, no restriction
    IF last_trial IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Return true if user has already used their lifetime free trial
    RETURN TRUE;
END;
$function$;

-- Add comments for clarity
COMMENT ON FUNCTION public.check_free_trial_eligibility(uuid) IS 'Checks if user has never used their lifetime free trial';
COMMENT ON FUNCTION public.check_free_trial_cooldown() IS 'Checks if current user has already used their lifetime free trial';