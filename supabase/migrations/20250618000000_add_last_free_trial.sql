-- Add last_free_trial column to users table
ALTER TABLE users ADD COLUMN last_free_trial TIMESTAMP WITH TIME ZONE;

-- Create function to check free trial eligibility
CREATE OR REPLACE FUNCTION check_free_trial_eligibility(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    last_trial TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the last free trial timestamp
    SELECT last_free_trial INTO last_trial
    FROM users
    WHERE id = user_id;

    -- If no previous trial or last trial was more than 24 hours ago
    RETURN last_trial IS NULL OR last_trial < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check free trial cooldown
CREATE OR REPLACE FUNCTION check_free_trial_cooldown()
RETURNS BOOLEAN AS $$
DECLARE
    last_trial TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the last free trial timestamp for the current user
    SELECT last_free_trial INTO last_trial
    FROM users
    WHERE id = auth.uid();

    -- Return true if user has used a free trial in the last 24 hours
    RETURN last_trial IS NOT NULL AND last_trial > NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update last free trial timestamp
CREATE OR REPLACE FUNCTION update_last_free_trial(user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET last_free_trial = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 