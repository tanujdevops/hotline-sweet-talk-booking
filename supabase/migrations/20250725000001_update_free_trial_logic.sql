-- Update free trial logic to be one-time per user (lifetime) instead of 24-hour cooldown

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

-- The IP-based cooldown function can remain for additional protection against abuse
-- but we'll keep it as 24-hour window for IP-based restrictions
-- This prevents multiple accounts from same IP abusing free trials

COMMENT ON FUNCTION public.check_free_trial_eligibility(uuid) IS 'Checks if user has never used their lifetime free trial';
COMMENT ON FUNCTION public.check_free_trial_cooldown() IS 'Checks if current user has already used their lifetime free trial';
COMMENT ON FUNCTION public.check_free_trial_cooldown(text) IS 'Checks if IP has used free trial in last 24 hours (abuse prevention)';