-- Enable Row Level Security on announcements table
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for announcements (since app handles auth differently)
CREATE POLICY "Allow all operations on announcements" 
ON public.announcements 
FOR ALL 
USING (true) 
WITH CHECK (true);