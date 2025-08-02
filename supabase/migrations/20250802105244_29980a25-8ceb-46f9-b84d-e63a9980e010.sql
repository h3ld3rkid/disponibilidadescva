-- Create a function to reset edit counters at the beginning of each month
CREATE OR REPLACE FUNCTION reset_edit_counters()
RETURNS void AS $$
BEGIN
  -- Reset edit_count to 0 for all schedules when a new month starts
  UPDATE schedules 
  SET edit_count = 0, updated_at = now()
  WHERE edit_count > 0;
  
  RAISE NOTICE 'Edit counters reset for all users';
END;
$$ LANGUAGE plpgsql;

-- Create a cron job to run this function on the 1st of every month at midnight
-- This requires pg_cron extension
SELECT cron.schedule(
  'reset-edit-counters-monthly',
  '0 0 1 * *', -- At 00:00 on day-of-month 1
  'SELECT reset_edit_counters();'
);