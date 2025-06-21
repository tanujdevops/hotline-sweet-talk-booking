

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."booking_status" AS ENUM (
    'pending',
    'confirmed',
    'completed',
    'cancelled',
    'failed',
    'pending_payment',
    'payment_failed',
    'queued',
    'initiating',
    'calling'
);


ALTER TYPE "public"."booking_status" OWNER TO "postgres";


CREATE TYPE "public"."plan_key" AS ENUM (
    'free_trial',
    'standard',
    'extended',
    'premium'
);


ALTER TYPE "public"."plan_key" OWNER TO "postgres";


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
$$;


ALTER FUNCTION "public"."add_booking_to_queue"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_call_durations"() RETURNS TABLE("booking_id" "uuid", "status" "text", "message" "text")
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."check_call_durations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_free_trial_cooldown"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    last_trial TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the last free trial timestamp for the current user
    SELECT last_free_trial INTO last_trial
    FROM users
    WHERE id = auth.uid();

    -- If no previous trial, no cooldown
    IF last_trial IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Return true if user has used a free trial in the last 24 hours
    RETURN last_trial > NOW() - INTERVAL '24 hours';
END;
$$;


ALTER FUNCTION "public"."check_free_trial_cooldown"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_free_trial_cooldown"("client_ip" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."check_free_trial_cooldown"("client_ip" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_free_trial_eligibility"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    last_trial TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the last free trial timestamp
    SELECT last_free_trial INTO last_trial
    FROM users
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
$$;


ALTER FUNCTION "public"."check_free_trial_eligibility"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_inactive_call"("p_booking_id" "uuid", "p_status" "text", "p_error_message" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
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
      error_message = p_error_message
  WHERE id = p_booking_id;

  -- Decrement call counts if we have agent and account IDs
  IF v_agent_id IS NOT NULL AND v_account_id IS NOT NULL THEN
    PERFORM public.decrement_call_count(v_agent_id, v_account_id);
  END IF;
END;
$$;


ALTER FUNCTION "public"."cleanup_inactive_call"("p_booking_id" "uuid", "p_status" "text", "p_error_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_stale_calls"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."cleanup_stale_calls"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_call_count"("agent_uuid" "uuid", "account_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."decrement_call_count"("agent_uuid" "uuid", "account_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."free_agent"("p_agent_id" "uuid", "p_account_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update agent status
  UPDATE public.vapi_agents 
  SET current_active_calls = GREATEST(0, current_active_calls - 1),
      updated_at = now()
  WHERE id = p_agent_id;
  
  -- Update account status
  UPDATE public.vapi_accounts 
  SET current_active_calls = GREATEST(0, current_active_calls - 1),
      updated_at = now()
  WHERE id = p_account_id;
END;
$$;


ALTER FUNCTION "public"."free_agent"("p_agent_id" "uuid", "p_account_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_booking_id"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  random_id TEXT;
BEGIN
  -- Generate a random 4-digit number as string
  random_id := lpad(floor(random() * 10000)::text, 4, '0');
  RETURN random_id;
END;
$$;


ALTER FUNCTION "public"."generate_booking_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_agent"("plan_type_param" "text") RETURNS TABLE("agent_id" "uuid", "vapi_agent_id" "uuid", "account_id" "uuid", "api_key" "text", "phone_number_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- First, clean up any stuck calls (calls that have been active for more than 2 hours)
  UPDATE vapi_agents va
  SET current_active_calls = (
    SELECT COUNT(*) 
    FROM active_calls ac 
    WHERE ac.vapi_agent_id = va.id 
    AND ac.started_at > NOW() - INTERVAL '2 hours'
  )
  WHERE va.agent_type = plan_type_param;

  -- Then return available agents
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


ALTER FUNCTION "public"."get_available_agent"("plan_type_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_call_end"("p_booking_id" "uuid", "p_call_id" "text", "p_agent_id" "uuid", "p_account_id" "uuid", "p_ended_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Remove from active calls
  DELETE FROM public.active_calls
  WHERE booking_id = p_booking_id;

  -- Update booking status based on end reason
  UPDATE public.bookings
  SET 
    status = CASE 
      WHEN p_ended_reason IN ('customer-ended-call', 'assistant-ended-call', 'exceeded-max-duration') THEN 'completed'::booking_status
      WHEN p_ended_reason = 'customer-busy' THEN 'failed'::booking_status
      WHEN p_ended_reason = 'customer-did-not-answer' THEN 'failed'::booking_status
      WHEN p_ended_reason = 'error' THEN 'failed'::booking_status
      ELSE 'completed'::booking_status  -- Default to completed for any other reason
    END,
    vapi_call_id = p_call_id::uuid,
    message = CASE 
      WHEN p_ended_reason = 'customer-ended-call' THEN 'Call completed - customer ended'
      WHEN p_ended_reason = 'assistant-ended-call' THEN 'Call completed - assistant ended'
      WHEN p_ended_reason = 'exceeded-max-duration' THEN 'Call completed - maximum duration reached'
      WHEN p_ended_reason = 'customer-busy' THEN 'Call failed - customer was busy'
      WHEN p_ended_reason = 'customer-did-not-answer' THEN 'Call failed - customer did not answer'
      WHEN p_ended_reason = 'error' THEN 'Call failed - technical error'
      ELSE 'Call completed'
    END
  WHERE id = p_booking_id;

  -- Decrement call counts
  PERFORM public.safe_decrement_call_count(p_agent_id, p_account_id);
END;
$$;


ALTER FUNCTION "public"."handle_call_end"("p_booking_id" "uuid", "p_call_id" "text", "p_agent_id" "uuid", "p_account_id" "uuid", "p_ended_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_call_count"("agent_uuid" "uuid", "account_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  agent_current_calls INTEGER;
  agent_max_calls INTEGER;
  account_current_calls INTEGER;
  account_max_calls INTEGER;
BEGIN
  -- Get current and max call counts with FOR UPDATE to lock rows
  SELECT current_active_calls, max_concurrent_calls 
  INTO agent_current_calls, agent_max_calls
  FROM public.vapi_agents
  WHERE id = agent_uuid
  FOR UPDATE;
  
  SELECT current_active_calls, max_concurrent_calls 
  INTO account_current_calls, account_max_calls
  FROM public.vapi_accounts
  WHERE id = account_uuid
  FOR UPDATE;
  
  -- Check if incrementing would exceed limits
  IF agent_current_calls >= agent_max_calls OR account_current_calls >= account_max_calls THEN
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


ALTER FUNCTION "public"."increment_call_count"("agent_uuid" "uuid", "account_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_queue_processing"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO public.call_events (
    event_type,
    details
  ) VALUES (
    'queue_processing',
    jsonb_build_object(
      'timestamp', now(),
      'message', 'Queue processing started'
    )
  );
END;
$$;


ALTER FUNCTION "public"."log_queue_processing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."safe_decrement_call_count"("agent_uuid" "uuid", "account_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."safe_decrement_call_count"("agent_uuid" "uuid", "account_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_booking_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Set the booking_id if it's not provided
  IF NEW.booking_id IS NULL THEN
    NEW.booking_id := generate_booking_id();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_booking_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_booking_payment_status"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT id, payment_intent_id
        FROM public.bookings
        WHERE status = 'pending_payment' OR payment_status = 'pending'
    LOOP
        -- You will need to check the payment status with Stripe manually or via an API call.
        -- For now, this function just prints the booking IDs for manual review.
        RAISE NOTICE 'Booking with pending payment: % (intent: %)', rec.id, rec.payment_intent_id;
        -- You can manually update bookings here if you know the payment status:
        -- UPDATE public.bookings SET status = 'queued', payment_status = 'completed' WHERE id = rec.id;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."sync_booking_payment_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_last_free_trial"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    updated_rows INTEGER;
BEGIN
    -- First verify the user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = user_id) THEN
        RAISE EXCEPTION 'User not found: %', user_id;
    END IF;

    -- Update the last_free_trial timestamp
    UPDATE users
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
$$;


ALTER FUNCTION "public"."update_last_free_trial"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_booking_tier"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Set duration and price based on tier
  CASE NEW.pricing_tier
    WHEN 'free_trial' THEN
      NEW.duration_minutes := 0.5;
      NEW.price := 0;
      NEW.is_trial := true;
    WHEN 'standard' THEN
      NEW.duration_minutes := 3;
      NEW.price := 2.49;
      NEW.is_trial := false;
    WHEN 'extended' THEN
      NEW.duration_minutes := 7;
      NEW.price := 4.99;
      NEW.is_trial := false;
  END CASE;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_booking_tier"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_free_trial"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.pricing_tier = 'free_trial' AND 
     public.check_free_trial_cooldown(NEW.user_ip) THEN
    RAISE EXCEPTION 'Free trial not available. Please wait 24 hours between free trials.';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_free_trial"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."active_calls" (
    "booking_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "vapi_call_id" "uuid",
    "vapi_agent_id" "uuid",
    "vapi_account_id" "uuid"
);


ALTER TABLE "public"."active_calls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "plan_id" integer,
    "status" "public"."booking_status" DEFAULT 'pending'::"public"."booking_status" NOT NULL,
    "vapi_call_id" "uuid",
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_intent_id" "text",
    "payment_status" "text" DEFAULT 'pending'::"text",
    "payment_amount" integer,
    "call_duration" integer DEFAULT 300 NOT NULL,
    "error_message" "text"
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."call_events_new_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."call_events_new_id_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."call_events" (
    "id" bigint DEFAULT "nextval"('"public"."call_events_new_id_seq"'::"regclass") NOT NULL,
    "booking_id" "uuid",
    "event_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event_type" "text" NOT NULL,
    "details" "jsonb"
)
PARTITION BY RANGE ("event_time");


ALTER TABLE "public"."call_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."call_events_default" (
    "id" bigint DEFAULT "nextval"('"public"."call_events_new_id_seq"'::"regclass") NOT NULL,
    "booking_id" "uuid",
    "event_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event_type" "text" NOT NULL,
    "details" "jsonb"
);


ALTER TABLE "public"."call_events_default" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."call_events_y2025m04" (
    "id" bigint DEFAULT "nextval"('"public"."call_events_new_id_seq"'::"regclass") NOT NULL,
    "booking_id" "uuid",
    "event_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event_type" "text" NOT NULL,
    "details" "jsonb"
);


ALTER TABLE "public"."call_events_y2025m04" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."call_events_y2025m05" (
    "id" bigint DEFAULT "nextval"('"public"."call_events_new_id_seq"'::"regclass") NOT NULL,
    "booking_id" "uuid",
    "event_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event_type" "text" NOT NULL,
    "details" "jsonb"
);


ALTER TABLE "public"."call_events_y2025m05" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."call_events_y2025m06" (
    "id" bigint DEFAULT "nextval"('"public"."call_events_new_id_seq"'::"regclass") NOT NULL,
    "booking_id" "uuid",
    "event_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event_type" "text" NOT NULL,
    "details" "jsonb"
);


ALTER TABLE "public"."call_events_y2025m06" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."call_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "plan_type" "text" NOT NULL,
    "priority" integer DEFAULT 1 NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "assigned_agent_id" "uuid",
    "assigned_account_id" "uuid",
    "retry_count" integer DEFAULT 0 NOT NULL,
    "max_retries" integer DEFAULT 3 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scheduled_for" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "call_queue_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'processing'::"text", 'assigned'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."call_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" integer NOT NULL,
    "booking_id" "uuid",
    "amount_cents" integer NOT NULL,
    "currency" "text" NOT NULL,
    "status" "text" NOT NULL,
    "cryptomus_invoice_id" "text",
    "cryptomus_payment_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payments_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."payments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payments_id_seq" OWNED BY "public"."payments"."id";



CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" integer NOT NULL,
    "key" "public"."plan_key" NOT NULL,
    "price_cents" integer NOT NULL,
    "duration_seconds" integer NOT NULL,
    "cryptomus_price_id" "text",
    "vapi_assistant_id" "uuid"
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."plans_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."plans_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."plans_id_seq" OWNED BY "public"."plans"."id";



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_free_trial" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vapi_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "api_key" "text" NOT NULL,
    "phone_number_id" "uuid",
    "max_concurrent_calls" integer DEFAULT 10 NOT NULL,
    "current_active_calls" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vapi_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vapi_agents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vapi_account_id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "agent_type" "text" NOT NULL,
    "max_concurrent_calls" integer DEFAULT 10 NOT NULL,
    "current_active_calls" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "priority" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "vapi_agents_agent_type_check" CHECK (("agent_type" = ANY (ARRAY['free_trial'::"text", 'standard'::"text", 'extended'::"text", 'premium'::"text"])))
);


ALTER TABLE "public"."vapi_agents" OWNER TO "postgres";


ALTER TABLE ONLY "public"."call_events" ATTACH PARTITION "public"."call_events_default" DEFAULT;



ALTER TABLE ONLY "public"."call_events" ATTACH PARTITION "public"."call_events_y2025m04" FOR VALUES FROM ('2025-04-01 00:00:00+00') TO ('2025-05-01 00:00:00+00');



ALTER TABLE ONLY "public"."call_events" ATTACH PARTITION "public"."call_events_y2025m05" FOR VALUES FROM ('2025-05-01 00:00:00+00') TO ('2025-06-01 00:00:00+00');



ALTER TABLE ONLY "public"."call_events" ATTACH PARTITION "public"."call_events_y2025m06" FOR VALUES FROM ('2025-06-01 00:00:00+00') TO ('2025-07-01 00:00:00+00');



ALTER TABLE ONLY "public"."payments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."plans" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."plans_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."active_calls"
    ADD CONSTRAINT "active_calls_pkey" PRIMARY KEY ("booking_id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."call_events"
    ADD CONSTRAINT "call_events_new_pkey" PRIMARY KEY ("id", "event_time");



ALTER TABLE ONLY "public"."call_events_default"
    ADD CONSTRAINT "call_events_default_pkey" PRIMARY KEY ("id", "event_time");



ALTER TABLE ONLY "public"."call_events_y2025m04"
    ADD CONSTRAINT "call_events_y2025m04_pkey" PRIMARY KEY ("id", "event_time");



ALTER TABLE ONLY "public"."call_events_y2025m05"
    ADD CONSTRAINT "call_events_y2025m05_pkey" PRIMARY KEY ("id", "event_time");



ALTER TABLE ONLY "public"."call_events_y2025m06"
    ADD CONSTRAINT "call_events_y2025m06_pkey" PRIMARY KEY ("id", "event_time");



ALTER TABLE ONLY "public"."call_queue"
    ADD CONSTRAINT "call_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_cryptomus_invoice_id_key" UNIQUE ("cryptomus_invoice_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_cryptomus_payment_id_key" UNIQUE ("cryptomus_payment_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vapi_accounts"
    ADD CONSTRAINT "vapi_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vapi_agents"
    ADD CONSTRAINT "vapi_agents_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_call_events_booking_id_event_time" ON ONLY "public"."call_events" USING "btree" ("booking_id", "event_time" DESC);



CREATE INDEX "call_events_default_booking_id_event_time_idx" ON "public"."call_events_default" USING "btree" ("booking_id", "event_time" DESC);



CREATE INDEX "idx_call_events_event_type" ON ONLY "public"."call_events" USING "btree" ("event_type");



CREATE INDEX "call_events_default_event_type_idx" ON "public"."call_events_default" USING "btree" ("event_type");



CREATE INDEX "call_events_y2025m04_booking_id_event_time_idx" ON "public"."call_events_y2025m04" USING "btree" ("booking_id", "event_time" DESC);



CREATE INDEX "call_events_y2025m04_event_type_idx" ON "public"."call_events_y2025m04" USING "btree" ("event_type");



CREATE INDEX "call_events_y2025m05_booking_id_event_time_idx" ON "public"."call_events_y2025m05" USING "btree" ("booking_id", "event_time" DESC);



CREATE INDEX "call_events_y2025m05_event_type_idx" ON "public"."call_events_y2025m05" USING "btree" ("event_type");



CREATE INDEX "call_events_y2025m06_booking_id_event_time_idx" ON "public"."call_events_y2025m06" USING "btree" ("booking_id", "event_time" DESC);



CREATE INDEX "call_events_y2025m06_event_type_idx" ON "public"."call_events_y2025m06" USING "btree" ("event_type");



CREATE INDEX "idx_active_calls_vapi_call_id" ON "public"."active_calls" USING "btree" ("vapi_call_id");



CREATE INDEX "idx_bookings_error_message" ON "public"."bookings" USING "btree" ("error_message") WHERE ("error_message" IS NOT NULL);



CREATE INDEX "idx_call_queue_plan_type" ON "public"."call_queue" USING "btree" ("plan_type", "status");



CREATE INDEX "idx_call_queue_status_priority" ON "public"."call_queue" USING "btree" ("status", "priority", "created_at");



CREATE INDEX "idx_vapi_accounts_active_calls" ON "public"."vapi_accounts" USING "btree" ("current_active_calls");



CREATE INDEX "idx_vapi_accounts_calls" ON "public"."vapi_accounts" USING "btree" ("current_active_calls", "max_concurrent_calls");



CREATE INDEX "idx_vapi_agents_active_calls" ON "public"."vapi_agents" USING "btree" ("current_active_calls");



CREATE INDEX "idx_vapi_agents_agent_type" ON "public"."vapi_agents" USING "btree" ("agent_type");



CREATE INDEX "idx_vapi_agents_calls" ON "public"."vapi_agents" USING "btree" ("current_active_calls", "max_concurrent_calls");



CREATE INDEX "idx_vapi_agents_type_active" ON "public"."vapi_agents" USING "btree" ("agent_type", "is_active");



ALTER INDEX "public"."idx_call_events_booking_id_event_time" ATTACH PARTITION "public"."call_events_default_booking_id_event_time_idx";



ALTER INDEX "public"."idx_call_events_event_type" ATTACH PARTITION "public"."call_events_default_event_type_idx";



ALTER INDEX "public"."call_events_new_pkey" ATTACH PARTITION "public"."call_events_default_pkey";



ALTER INDEX "public"."idx_call_events_booking_id_event_time" ATTACH PARTITION "public"."call_events_y2025m04_booking_id_event_time_idx";



ALTER INDEX "public"."idx_call_events_event_type" ATTACH PARTITION "public"."call_events_y2025m04_event_type_idx";



ALTER INDEX "public"."call_events_new_pkey" ATTACH PARTITION "public"."call_events_y2025m04_pkey";



ALTER INDEX "public"."idx_call_events_booking_id_event_time" ATTACH PARTITION "public"."call_events_y2025m05_booking_id_event_time_idx";



ALTER INDEX "public"."idx_call_events_event_type" ATTACH PARTITION "public"."call_events_y2025m05_event_type_idx";



ALTER INDEX "public"."call_events_new_pkey" ATTACH PARTITION "public"."call_events_y2025m05_pkey";



ALTER INDEX "public"."idx_call_events_booking_id_event_time" ATTACH PARTITION "public"."call_events_y2025m06_booking_id_event_time_idx";



ALTER INDEX "public"."idx_call_events_event_type" ATTACH PARTITION "public"."call_events_y2025m06_event_type_idx";



ALTER INDEX "public"."call_events_new_pkey" ATTACH PARTITION "public"."call_events_y2025m06_pkey";



CREATE OR REPLACE TRIGGER "add_booking_to_queue_trigger" AFTER INSERT OR UPDATE OF "status" ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."add_booking_to_queue"();



CREATE OR REPLACE TRIGGER "booking_insert_hook" AFTER INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://emtwxyywgszhboxpaunk.supabase.co/functions/v1/process-call-queue', 'POST', '{"Content-type":"application/json", "Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtdHd4eXl3Z3N6aGJveHBhdW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDcyNDQ5NSwiZXhwIjoyMDYwMzAwNDk1fQ.usk0IgWMWID53_A_bE0D1DpHdIAL2plgjORLRzGi-EM"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "update_call_queue_updated_at" BEFORE UPDATE ON "public"."call_queue" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_vapi_accounts_updated_at" BEFORE UPDATE ON "public"."vapi_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_vapi_agents_updated_at" BEFORE UPDATE ON "public"."vapi_agents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."active_calls"
    ADD CONSTRAINT "active_calls_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id");



ALTER TABLE ONLY "public"."active_calls"
    ADD CONSTRAINT "active_calls_vapi_account_id_fkey" FOREIGN KEY ("vapi_account_id") REFERENCES "public"."vapi_accounts"("id");



ALTER TABLE ONLY "public"."active_calls"
    ADD CONSTRAINT "active_calls_vapi_agent_id_fkey" FOREIGN KEY ("vapi_agent_id") REFERENCES "public"."vapi_agents"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE "public"."call_events"
    ADD CONSTRAINT "call_events_new_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."call_queue"
    ADD CONSTRAINT "call_queue_assigned_account_id_fkey" FOREIGN KEY ("assigned_account_id") REFERENCES "public"."vapi_accounts"("id");



ALTER TABLE ONLY "public"."call_queue"
    ADD CONSTRAINT "call_queue_assigned_agent_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."vapi_agents"("id");



ALTER TABLE ONLY "public"."call_queue"
    ADD CONSTRAINT "call_queue_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id");



ALTER TABLE ONLY "public"."vapi_agents"
    ADD CONSTRAINT "vapi_agents_vapi_account_id_fkey" FOREIGN KEY ("vapi_account_id") REFERENCES "public"."vapi_accounts"("id") ON DELETE CASCADE;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";












GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
































































































































































































GRANT ALL ON FUNCTION "public"."add_booking_to_queue"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_booking_to_queue"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_booking_to_queue"() TO "service_role";



GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_call_durations"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_call_durations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_call_durations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_free_trial_cooldown"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_free_trial_cooldown"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_free_trial_cooldown"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_free_trial_cooldown"("client_ip" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_free_trial_cooldown"("client_ip" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_free_trial_cooldown"("client_ip" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_free_trial_eligibility"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_free_trial_eligibility"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_free_trial_eligibility"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_inactive_call"("p_booking_id" "uuid", "p_status" "text", "p_error_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_inactive_call"("p_booking_id" "uuid", "p_status" "text", "p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_inactive_call"("p_booking_id" "uuid", "p_status" "text", "p_error_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_stale_calls"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_stale_calls"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_stale_calls"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_call_count"("agent_uuid" "uuid", "account_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_call_count"("agent_uuid" "uuid", "account_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_call_count"("agent_uuid" "uuid", "account_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."free_agent"("p_agent_id" "uuid", "p_account_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."free_agent"("p_agent_id" "uuid", "p_account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."free_agent"("p_agent_id" "uuid", "p_account_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_booking_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_booking_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_booking_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_agent"("plan_type_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_agent"("plan_type_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_agent"("plan_type_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_call_end"("p_booking_id" "uuid", "p_call_id" "text", "p_agent_id" "uuid", "p_account_id" "uuid", "p_ended_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_call_end"("p_booking_id" "uuid", "p_call_id" "text", "p_agent_id" "uuid", "p_account_id" "uuid", "p_ended_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_call_end"("p_booking_id" "uuid", "p_call_id" "text", "p_agent_id" "uuid", "p_account_id" "uuid", "p_ended_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "postgres";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "anon";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_call_count"("agent_uuid" "uuid", "account_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_call_count"("agent_uuid" "uuid", "account_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_call_count"("agent_uuid" "uuid", "account_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_queue_processing"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_queue_processing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_queue_processing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_decrement_call_count"("agent_uuid" "uuid", "account_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_decrement_call_count"("agent_uuid" "uuid", "account_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_decrement_call_count"("agent_uuid" "uuid", "account_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_booking_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_booking_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_booking_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_booking_payment_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_booking_payment_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_booking_payment_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_last_free_trial"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_last_free_trial"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_last_free_trial"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_booking_tier"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_booking_tier"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_booking_tier"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_free_trial"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_free_trial"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_free_trial"() TO "service_role";
























GRANT ALL ON TABLE "public"."active_calls" TO "anon";
GRANT ALL ON TABLE "public"."active_calls" TO "authenticated";
GRANT ALL ON TABLE "public"."active_calls" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."call_events_new_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."call_events_new_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."call_events_new_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."call_events" TO "anon";
GRANT ALL ON TABLE "public"."call_events" TO "authenticated";
GRANT ALL ON TABLE "public"."call_events" TO "service_role";



GRANT ALL ON TABLE "public"."call_events_default" TO "anon";
GRANT ALL ON TABLE "public"."call_events_default" TO "authenticated";
GRANT ALL ON TABLE "public"."call_events_default" TO "service_role";



GRANT ALL ON TABLE "public"."call_events_y2025m04" TO "anon";
GRANT ALL ON TABLE "public"."call_events_y2025m04" TO "authenticated";
GRANT ALL ON TABLE "public"."call_events_y2025m04" TO "service_role";



GRANT ALL ON TABLE "public"."call_events_y2025m05" TO "anon";
GRANT ALL ON TABLE "public"."call_events_y2025m05" TO "authenticated";
GRANT ALL ON TABLE "public"."call_events_y2025m05" TO "service_role";



GRANT ALL ON TABLE "public"."call_events_y2025m06" TO "anon";
GRANT ALL ON TABLE "public"."call_events_y2025m06" TO "authenticated";
GRANT ALL ON TABLE "public"."call_events_y2025m06" TO "service_role";



GRANT ALL ON TABLE "public"."call_queue" TO "anon";
GRANT ALL ON TABLE "public"."call_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."call_queue" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON SEQUENCE "public"."plans_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."plans_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."plans_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."vapi_accounts" TO "anon";
GRANT ALL ON TABLE "public"."vapi_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."vapi_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."vapi_agents" TO "anon";
GRANT ALL ON TABLE "public"."vapi_agents" TO "authenticated";
GRANT ALL ON TABLE "public"."vapi_agents" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
