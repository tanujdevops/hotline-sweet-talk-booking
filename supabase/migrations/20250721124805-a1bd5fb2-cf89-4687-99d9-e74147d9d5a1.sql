-- Fix RLS policy conflicts on bookings table
-- Remove the conflicting policy that only allows free trial bookings
DROP POLICY IF EXISTS "Allow only free trial bookings" ON public.bookings;

-- Keep the general policies but ensure they work correctly
-- The existing "Anyone can insert bookings" and "Anyone can select bookings" policies should handle this

-- Add better error handling for edge functions by improving the initiate-vapi-call function
-- This function needs better error responses and logging