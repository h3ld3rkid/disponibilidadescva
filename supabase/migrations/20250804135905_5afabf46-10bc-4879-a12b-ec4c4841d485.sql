-- Create function to get admin notifications
CREATE OR REPLACE FUNCTION public.get_admin_notifications()
RETURNS TABLE (
  id uuid,
  message text,
  user_email text,
  created_at timestamp with time zone,
  is_read boolean
)
LANGUAGE plpgsql
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

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE admin_notifications 
  SET is_read = true 
  WHERE id = notification_id;
END;
$function$;

-- Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE admin_notifications 
  SET is_read = true 
  WHERE is_read = false;
END;
$function$;