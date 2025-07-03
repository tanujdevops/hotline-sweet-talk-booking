-- Reset test users for free trial testing
-- This allows immediate testing of the free trial functionality

-- Reset the last_free_trial timestamp for test users to allow immediate testing
UPDATE users 
SET last_free_trial = NULL 
WHERE phone IN (
  SELECT DISTINCT u.phone 
  FROM users u 
  JOIN bookings b ON u.id = b.user_id 
  JOIN plans p ON b.plan_id = p.id 
  WHERE p.key = 'free_trial' 
  AND b.created_at > NOW() - INTERVAL '7 days'
);

-- Update any stuck free trial bookings to allow retesting
UPDATE bookings 
SET status = 'cancelled'
WHERE status IN ('pending', 'initiating', 'queued') 
AND id IN (
  SELECT b.id 
  FROM bookings b 
  JOIN plans p ON b.plan_id = p.id 
  WHERE p.key = 'free_trial' 
  AND b.created_at > NOW() - INTERVAL '7 days'
);