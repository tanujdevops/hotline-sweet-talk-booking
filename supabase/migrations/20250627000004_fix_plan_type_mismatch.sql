-- Fix plan type mismatch between 'free-trial' and 'free_trial'
-- The database enum uses 'free_trial' but some functions check for 'free-trial'

-- Update the add_booking_to_queue function to use correct plan key
CREATE OR REPLACE FUNCTION "public"."add_booking_to_queue"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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

        -- Insert into call queue with correct plan type check
        INSERT INTO public.call_queue (
          booking_id,
          plan_type,
          priority,
          status,
          scheduled_for
        ) VALUES (
          NEW.id,
          v_plan_type,
          CASE WHEN v_plan_type = 'free_trial' THEN 2 ELSE 1 END, -- Fixed: use 'free_trial' not 'free-trial'
          'queued',
          now()
        );
      END IF;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- Update the validate_free_trial function to use correct plan type
CREATE OR REPLACE FUNCTION "public"."validate_free_trial"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Check if this is a free trial plan by looking up the plan key
  DECLARE
    v_plan_key TEXT;
  BEGIN
    SELECT key INTO v_plan_key
    FROM public.plans
    WHERE id = NEW.plan_id;
    
    IF v_plan_key = 'free_trial' AND 
       public.check_free_trial_cooldown(NEW.user_ip) THEN
      RAISE EXCEPTION 'Free trial not available. Please wait 24 hours between free trials.';
    END IF;
  END;
  RETURN NEW;
END;
$$;

-- Add a comment explaining the fix
COMMENT ON FUNCTION "public"."add_booking_to_queue"() IS 'Updated to use correct plan_key enum value free_trial instead of free-trial';
COMMENT ON FUNCTION "public"."validate_free_trial"() IS 'Updated to check plan_key from plans table instead of pricing_tier field';