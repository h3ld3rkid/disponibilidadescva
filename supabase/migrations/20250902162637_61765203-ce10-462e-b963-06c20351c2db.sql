-- Enable Row Level Security on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see their own profile
CREATE POLICY "Users can view own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid()::text = id::text);

-- Create policy to allow admins to view all users
CREATE POLICY "Admins can view all users" 
ON public.users 
FOR SELECT 
USING (role = 'admin');

-- Create policy to allow admins to insert users
CREATE POLICY "Admins can insert users" 
ON public.users 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id::text = auth.uid()::text 
    AND role = 'admin'
  )
);

-- Create policy to allow admins to update users
CREATE POLICY "Admins can update users" 
ON public.users 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id::text = auth.uid()::text 
    AND role = 'admin'
  )
);

-- Create policy to allow admins to delete users
CREATE POLICY "Admins can delete users" 
ON public.users 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id::text = auth.uid()::text 
    AND role = 'admin'
  )
);