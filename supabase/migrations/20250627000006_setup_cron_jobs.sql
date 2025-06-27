-- Set up pg_cron jobs for automated queue processing
-- This replaces the dangerous HTTP trigger approach

-- Enable pg_cron extension if not already enabled
-- Note: This requires superuser permissions and may need to be done manually in production
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to process the queue via cron
CREATE OR REPLACE FUNCTION process_queue_cron()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  queue_item RECORD;
  agent_result RECORD;
  new_retry_count INTEGER;
  retry_delay_seconds INTEGER;
  scheduled_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Process up to 10 queue items at a time
  FOR queue_item IN (
    SELECT cq.id, cq.booking_id, cq.plan_type, cq.retry_count, cq.max_retries
    FROM call_queue cq
    JOIN bookings b ON cq.booking_id = b.id
    WHERE cq.status = 'queued'
    AND cq.scheduled_for <= NOW()
    AND b.status IN ('pending', 'queued')
    ORDER BY cq.priority ASC, cq.created_at ASC
    LIMIT 10
  ) LOOP
    
    BEGIN
      -- Check if agent is available
      SELECT * INTO agent_result
      FROM get_available_agent(queue_item.plan_type)
      LIMIT 1;
      
      IF FOUND THEN
        -- Try to initiate the call by updating booking status
        UPDATE bookings 
        SET status = 'initiating'
        WHERE id = queue_item.booking_id
        AND status IN ('pending', 'queued');
        
        -- Remove from queue on success
        DELETE FROM call_queue WHERE id = queue_item.id;
        
        RAISE NOTICE 'Successfully processed queue item % for booking %', 
          queue_item.id, queue_item.booking_id;
          
      ELSE
        -- No agent available, leave in queue
        RAISE NOTICE 'No agent available for plan type %, leaving in queue', queue_item.plan_type;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Handle errors with retry logic
      new_retry_count := COALESCE(queue_item.retry_count, 0) + 1;
      
      IF new_retry_count >= queue_item.max_retries THEN
        -- Max retries reached, mark as failed
        UPDATE call_queue 
        SET status = 'failed', retry_count = new_retry_count
        WHERE id = queue_item.id;
        
        UPDATE bookings 
        SET status = 'failed', 
            error_message = 'Failed to process after ' || new_retry_count || ' attempts'
        WHERE id = queue_item.booking_id;
        
        RAISE NOTICE 'Queue item % failed after % attempts', queue_item.id, new_retry_count;
      ELSE
        -- Schedule for retry with exponential backoff
        retry_delay_seconds := POWER(2, new_retry_count) * 60; -- 2, 4, 8 minutes
        scheduled_time := NOW() + (retry_delay_seconds || ' seconds')::INTERVAL;
        
        UPDATE call_queue 
        SET retry_count = new_retry_count,
            scheduled_for = scheduled_time
        WHERE id = queue_item.id;
        
        RAISE NOTICE 'Queue item % scheduled for retry % in % seconds', 
          queue_item.id, new_retry_count, retry_delay_seconds;
      END IF;
    END;
  END LOOP;
END;
$$;

-- Create a function to cleanup stale queue items
CREATE OR REPLACE FUNCTION cleanup_stale_queue()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Remove queue items for completed/cancelled bookings
  DELETE FROM call_queue 
  WHERE booking_id IN (
    SELECT id FROM bookings 
    WHERE status IN ('completed', 'cancelled', 'failed')
  );
  
  -- Remove very old failed queue items (older than 24 hours)
  DELETE FROM call_queue 
  WHERE status = 'failed' 
  AND created_at < NOW() - INTERVAL '24 hours';
  
  RAISE NOTICE 'Cleaned up stale queue items';
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION process_queue_cron() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_stale_queue() TO service_role;

-- Instructions for setting up cron jobs (to be run manually with appropriate permissions):
/*
-- Process queue every minute
SELECT cron.schedule('process-call-queue', '* * * * *', 'SELECT process_queue_cron();');

-- Cleanup stale items every hour
SELECT cron.schedule('cleanup-queue', '0 * * * *', 'SELECT cleanup_stale_queue();');

-- View scheduled jobs
SELECT * FROM cron.job;

-- To remove jobs if needed:
-- SELECT cron.unschedule('process-call-queue');
-- SELECT cron.unschedule('cleanup-queue');
*/

COMMENT ON FUNCTION process_queue_cron() IS 'Processes call queue with retry logic and error handling';
COMMENT ON FUNCTION cleanup_stale_queue() IS 'Removes old and orphaned queue items';