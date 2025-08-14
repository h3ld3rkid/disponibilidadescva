-- Simplify everything and remove hash dependencies
-- Drop and recreate with working RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;  
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;

-- Drop hash function that's causing issues
DROP FUNCTION IF EXISTS hash_password CASCADE;

-- Create simple RLS policies that work
CREATE POLICY "Enable read access for admins" ON public.users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email' 
    AND u.is_admin = true
  )
);

CREATE POLICY "Enable insert for admins" ON public.users
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email' 
    AND u.is_admin = true
  )
);

CREATE POLICY "Enable update for admins" ON public.users
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email' 
    AND u.is_admin = true
  )
);

-- Allow users to see and update their own profile
CREATE POLICY "Users can see own profile" ON public.users
FOR SELECT USING (email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE USING (email = current_setting('request.jwt.claims', true)::json->>'email');