-- Fix search path security issues for existing functions

-- Update get_admin_notifications function
CREATE OR REPLACE FUNCTION public.get_admin_notifications()
RETURNS TABLE(id uuid, message text, user_email text, created_at timestamp with time zone, is_read boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update mark_notification_read function
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE admin_notifications 
  SET is_read = true 
  WHERE id = notification_id;
END;
$$;

-- Update mark_all_notifications_read function
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE admin_notifications 
  SET is_read = true 
  WHERE is_read = false;
END;
$$;