-- Fix function search path security issues

-- Update hash_password function with proper search path
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use crypt function with blowfish algorithm for secure password hashing
  RETURN crypt(password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Update verify_password function with proper search path
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN crypt(password, hash) = hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Update is_current_user_admin function with proper search path
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email' 
    AND (role = 'admin' OR is_admin = TRUE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';

-- Update get_current_user_email function with proper search path
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::json->>'email';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';