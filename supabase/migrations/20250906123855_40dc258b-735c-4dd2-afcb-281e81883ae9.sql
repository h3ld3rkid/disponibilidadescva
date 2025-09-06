-- Fix infinite recursion in users table RLS policies
-- First drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can create users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'email',
    current_setting('request.jwt.claims', true)::json->>'user_email'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL  
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    current_setting('request.jwt.claims', true)::json->>'user_role'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER  
STABLE
SET search_path = public
AS $$
  SELECT public.get_current_user_role() = 'admin';
$$;

-- Create new RLS policies using security definer functions
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
USING (email = public.get_current_user_email());

CREATE POLICY "Admins can view all users"
ON public.users  
FOR SELECT
USING (public.is_admin_user());

CREATE POLICY "Admins can create users"
ON public.users
FOR INSERT
WITH CHECK (public.is_admin_user());

CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
USING (email = public.get_current_user_email())
WITH CHECK (email = public.get_current_user_email());

CREATE POLICY "Admins can update all users"
ON public.users
FOR UPDATE
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can delete users"
ON public.users
FOR DELETE
USING (public.is_admin_user());