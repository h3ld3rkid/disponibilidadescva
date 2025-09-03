-- Enable Row Level Security on system_settings table
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for system_settings (since app handles auth differently)
CREATE POLICY "Allow all operations on system_settings" 
ON public.system_settings 
FOR ALL 
USING (true) 
WITH CHECK (true);