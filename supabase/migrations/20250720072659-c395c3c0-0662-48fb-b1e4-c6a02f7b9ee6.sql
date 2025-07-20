
-- Fix the users table to not set last_free_trial by default
ALTER TABLE public.users ALTER COLUMN last_free_trial DROP DEFAULT;

-- Clean up existing users who haven't actually used their free trial
-- Set last_free_trial to NULL for users who don't have any completed free trial bookings
UPDATE public.users 
SET last_free_trial = NULL 
WHERE id NOT IN (
  SELECT DISTINCT u.id 
  FROM public.users u
  JOIN public.bookings b ON b.user_id = u.id
  JOIN public.plans p ON p.id = b.plan_id
  WHERE p.key = 'free_trial' 
  AND b.status IN ('completed', 'calling')
);

-- Update the upsert_user function to not set last_free_trial for new users
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
