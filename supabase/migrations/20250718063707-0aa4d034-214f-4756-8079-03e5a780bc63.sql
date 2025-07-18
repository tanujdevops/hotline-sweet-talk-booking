-- Fix handle_call_end function to use SECURITY DEFINER so webhooks can call it
CREATE OR REPLACE FUNCTION public.handle_call_end(p_booking_id uuid, p_call_id text, p_agent_id uuid, p_account_id uuid, p_ended_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$