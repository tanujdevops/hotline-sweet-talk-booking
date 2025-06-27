-- Remove the dangerous HTTP trigger that exposes service role key
-- This trigger was calling process-call-queue with a hardcoded JWT token
DROP TRIGGER IF EXISTS "booking_upsert_hook" ON "public"."bookings";

-- We'll replace this with a proper cron-based queue processing system
-- The add_booking_to_queue_trigger is safe and should remain as it only adds to queue table