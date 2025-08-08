-- Add timestamp column for Blockonomics payment creation tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS blockonomics_created_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN bookings.blockonomics_created_at IS 'Timestamp when Blockonomics payment address was created for this booking';