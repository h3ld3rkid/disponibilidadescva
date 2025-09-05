-- Fix the authenticate_user function to include proper search_path
CREATE OR REPLACE FUNCTION public.authenticate_user(p_email text, p_password text)
RETURNS TABLE(success boolean, user_email text, user_role text, user_name text, needs_password_change boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT * INTO user_record
  FROM public.get_user_for_auth(p_email);
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::BOOLEAN;
    RETURN;
  END IF;
  
  IF p_password != user_record.password_hash THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::BOOLEAN;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    true,
    user_record.email,
    user_record.role::TEXT,
    user_record.name,
    user_record.needs_password_change;
END;
$$;