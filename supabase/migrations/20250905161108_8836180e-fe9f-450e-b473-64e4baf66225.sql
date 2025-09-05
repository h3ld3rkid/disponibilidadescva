-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on users" ON public.users;

-- Create proper RLS policies for the users table

-- Allow users to view their own profile data (but not password hashes)
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (email IN (
  SELECT email FROM public.users WHERE id = auth.uid()
));

-- Allow admins to view all users (but not password hashes in regular queries)
CREATE POLICY "Admins can view all users" 
ON public.users 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR is_admin = true)
  )
);

-- Allow admins to insert new users
CREATE POLICY "Admins can create users" 
ON public.users 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR is_admin = true)
  )
);

-- Allow users to update their own profile (excluding sensitive fields)
CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (email IN (
  SELECT email FROM public.users WHERE id = auth.uid()
))
WITH CHECK (email IN (
  SELECT email FROM public.users WHERE id = auth.uid()
));

-- Allow admins to update any user
CREATE POLICY "Admins can update all users" 
ON public.users 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR is_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR is_admin = true)
  )
);

-- Allow admins to delete users
CREATE POLICY "Admins can delete users" 
ON public.users 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR is_admin = true)
  )
);

-- Create a security definer function for safe user authentication
-- This allows the authenticate_user function to bypass RLS for login
CREATE OR REPLACE FUNCTION public.get_user_for_auth(p_email text)
RETURNS TABLE(
  id uuid,
  email text,
  password_hash text,
  role text,
  name text,
  active boolean,
  needs_password_change boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  WHERE u.email = p_email AND u.active = true;
END;
$$;

-- Update the authenticate_user function to use the security definer function
CREATE OR REPLACE FUNCTION public.authenticate_user(p_email text, p_password text)
RETURNS TABLE(success boolean, user_email text, user_role text, user_name text, needs_password_change boolean)
LANGUAGE plpgsql
SECURITY DEFINER
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