
-- Add manually_blocked column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS manually_blocked boolean NOT NULL DEFAULT false;

-- Update get_user_for_auth to also reject manually blocked users
CREATE OR REPLACE FUNCTION public.get_user_for_auth(p_email text)
 RETURNS TABLE(id uuid, email text, password_hash text, role text, name text, active boolean, needs_password_change boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.password_hash,
    u.role,
    u.name,
    u.active,
    u.needs_password_change
  FROM public.users u
  WHERE u.email = p_email AND u.active = true AND (u.manually_blocked IS NULL OR u.manually_blocked = false);
END;
$function$;
