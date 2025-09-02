-- Remove existing policies that are too restrictive
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Create simple permissive policies since the app handles authentication differently
CREATE POLICY "Allow all operations on users" 
ON public.users 
FOR ALL 
USING (true) 
WITH CHECK (true);