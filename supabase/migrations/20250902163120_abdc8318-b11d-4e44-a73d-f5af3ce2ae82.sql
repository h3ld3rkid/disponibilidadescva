-- Enable Row Level Security on schedules table
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for schedules (since app handles auth differently)
CREATE POLICY "Allow all operations on schedules" 
ON public.schedules 
FOR ALL 
USING (true) 
WITH CHECK (true);