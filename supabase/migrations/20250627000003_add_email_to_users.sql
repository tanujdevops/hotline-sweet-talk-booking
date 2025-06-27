-- Add email field to users table for Stripe compliance
-- This fixes the critical issue of fake email generation

-- Add email column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

-- Add constraint to ensure email format is valid (basic validation)
ALTER TABLE users ADD CONSTRAINT valid_email_format 
CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Update the users table constraint to require either email or ensure it's collected
-- Note: We can't make email required immediately as existing users don't have emails
-- This will need to be handled in the application logic

-- Add a comment explaining the email requirement
COMMENT ON COLUMN users.email IS 'User email address - required for Stripe payments and communication';

-- Create a function to validate user has email before payment
CREATE OR REPLACE FUNCTION ensure_user_has_email(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM users
  WHERE id = user_uuid;
  
  RETURN user_email IS NOT NULL AND length(trim(user_email)) > 0;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION ensure_user_has_email(UUID) TO service_role;

COMMENT ON FUNCTION ensure_user_has_email(UUID) IS 'Validates that a user has a valid email before payment processing';