-- Enable Row Level Security on password_reset_requests table
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for password_reset_requests (since app handles auth differently)
CREATE POLICY "Allow all operations on password_reset_requests" 
ON public.password_reset_requests 
FOR ALL 
USING (true) 
WITH CHECK (true);