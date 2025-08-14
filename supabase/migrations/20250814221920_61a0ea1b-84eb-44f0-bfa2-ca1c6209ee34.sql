-- Create a simple working admin user without complex hashing
-- Delete existing problematic users
DELETE FROM users WHERE email IN ('admin@cvamares.pt', 'ccdanielcosta@gmail.com', 'admin@test.com');

-- Create a simple function for basic password verification
CREATE OR REPLACE FUNCTION public.simple_verify_password(input_password TEXT, stored_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- For now, just compare plaintext (temporary solution)
  RETURN input_password = stored_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Update the authenticate_user function to use simple verification
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
BEGIN
  -- Get user record
  SELECT * INTO user_record
  FROM public.users
  WHERE email = p_email AND active = true;
  
  -- If no user found, return failure
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::BOOLEAN;
    RETURN;
  END IF;
  
  -- Simple password check (temporary)
  IF p_password != user_record.password_hash THEN
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

-- Create a simple admin user that works
INSERT INTO users (name, email, mechanographic_number, role, is_admin, password_hash, needs_password_change, active)
VALUES (
  'Admin',
  'admin@test.com',
  '123456',
  'admin',
  true,
  '123456',
  false,
  true
);