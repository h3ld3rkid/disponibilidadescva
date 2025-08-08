-- Fix security warnings by adding search_path to all functions
-- Update get_admin_notifications function
CREATE OR REPLACE FUNCTION public.get_admin_notifications()
 RETURNS TABLE(id uuid, message text, user_email text, created_at timestamp with time zone, is_read boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    an.id,
    an.message,
    an.user_email,
    an.created_at,
    an.is_read
  FROM admin_notifications an
  ORDER BY an.created_at DESC
  LIMIT 50;
END;
$function$;

-- Update mark_notification_read function
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE admin_notifications 
  SET is_read = true 
  WHERE id = notification_id;
END;
$function$;

-- Update reset_edit_counters function
CREATE OR REPLACE FUNCTION public.reset_edit_counters()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Reset edit_count to 0 for all schedules when a new month starts
  UPDATE schedules 
  SET edit_count = 0, updated_at = now()
  WHERE edit_count > 0;
  
  RAISE NOTICE 'Edit counters reset for all users';
END;
$function$;

-- Update mark_all_notifications_read function
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE admin_notifications 
  SET is_read = true 
  WHERE is_read = false;
END;
$function$;

-- Update check_and_reset_monthly_counters function
CREATE OR REPLACE FUNCTION public.check_and_reset_monthly_counters(current_month text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;