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

-- Create a function to check and reset counters based on month change
CREATE OR REPLACE FUNCTION check_and_reset_monthly_counters(current_month TEXT)
RETURNS boolean AS $$
DECLARE
  last_reset_month TEXT;
  needs_reset BOOLEAN := FALSE;
BEGIN
  -- Get the last reset month from system settings
  SELECT value INTO last_reset_month 
  FROM system_settings 
  WHERE key = 'last_counter_reset_month';
  
  -- If no record exists or the month has changed, reset is needed
  IF last_reset_month IS NULL OR last_reset_month != current_month THEN
    needs_reset := TRUE;
    
    -- Reset all edit counters
    UPDATE schedules 
    SET edit_count = 0, updated_at = now()
    WHERE edit_count > 0;
    
    -- Update or insert the last reset month
    INSERT INTO system_settings (key, value, description) 
    VALUES ('last_counter_reset_month', current_month, 'Last month when edit counters were reset')
    ON CONFLICT (key) 
    DO UPDATE SET value = current_month, updated_at = now();
    
    RAISE NOTICE 'Edit counters reset for month: %', current_month;
  END IF;
  
  RETURN needs_reset;
END;
$$ LANGUAGE plpgsql;