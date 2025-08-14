-- Create a secure login function that bypasses RLS for authentication
CREATE OR REPLACE FUNCTION public.authenticate_user(
  p_email TEXT,
  p_password TEXT
) RETURNS TABLE(
  success BOOLEAN,
  user_email TEXT,
  user_role TEXT,
  user_name TEXT,
  needs_password_change BOOLEAN
) AS $$
DECLARE
  user_record RECORD;
  password_valid BOOLEAN;
BEGIN
  -- Get user record (bypasses RLS due to SECURITY DEFINER)
  SELECT * INTO user_record
  FROM public.users
  WHERE email = p_email AND active = true;
  
  -- If no user found, return failure
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::BOOLEAN;
    RETURN;
  END IF;
  
  -- Verify password
  SELECT public.verify_password(p_password, user_record.password_hash) INTO password_valid;
  
  -- If password invalid, return failure
  IF NOT password_valid THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::BOOLEAN;
    RETURN;
  END IF;
  
  -- Return success with user details
  RETURN QUERY SELECT 
    true,
    user_record.email,
    user_record.role::TEXT,
    user_record.name,
    user_record.needs_password_change;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Grant execute permission to anonymous users (needed for login)
GRANT EXECUTE ON FUNCTION public.authenticate_user(TEXT, TEXT) TO anon;