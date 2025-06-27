-- Create atomic user operations to prevent race conditions
-- This fixes the issue where concurrent user creations could create duplicates

-- Create an atomic function for user creation/update
CREATE OR REPLACE FUNCTION upsert_user(
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Use INSERT ... ON CONFLICT to handle race conditions atomically
  INSERT INTO users (name, email, phone, created_at)
  VALUES (p_name, p_email, p_phone, NOW())
  ON CONFLICT (phone) 
  DO UPDATE SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email
  RETURNING id INTO user_id;
  
  RETURN user_id;
END;
$$;

-- Create an atomic function for booking creation with user upsert
CREATE OR REPLACE FUNCTION create_booking_with_user(
  p_user_name TEXT,
  p_user_email TEXT,
  p_user_phone TEXT,
  p_plan_id INTEGER,
  p_message TEXT,
  p_call_duration INTEGER DEFAULT 300
)
RETURNS TABLE(booking_id UUID, user_id UUID)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_booking_id UUID;
BEGIN
  -- Atomically create or update user
  v_user_id := upsert_user(p_user_name, p_user_email, p_user_phone);
  
  -- Create booking
  INSERT INTO bookings (user_id, plan_id, message, call_duration, created_at)
  VALUES (v_user_id, p_plan_id, p_message, p_call_duration, NOW())
  RETURNING id INTO v_booking_id;
  
  -- Return both IDs
  RETURN QUERY SELECT v_booking_id, v_user_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION upsert_user(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_booking_with_user(TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER) TO anon;

-- Add comments
COMMENT ON FUNCTION upsert_user(TEXT, TEXT, TEXT) IS 'Atomically creates or updates user to prevent race conditions';
COMMENT ON FUNCTION create_booking_with_user(TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER) IS 'Atomically creates booking with user upsert to prevent race conditions';