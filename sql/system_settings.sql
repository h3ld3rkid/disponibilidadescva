
-- Create a system_settings table for storing application settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on the system_settings table
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to select settings
CREATE POLICY "Allow authenticated users to select settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow admin users to insert, update, delete settings
-- This requires a separate table for user roles
-- For now, allowing all authenticated users to manage settings
CREATE POLICY "Allow authenticated users to insert settings"
  ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update settings"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete settings"
  ON public.system_settings
  FOR DELETE
  TO authenticated
  USING (true);
  
-- Enable realtime for the system_settings table
ALTER PUBLICATION supabase_realtime ADD TABLE system_settings;
ALTER TABLE system_settings REPLICA IDENTITY FULL;

-- Enable realtime for the schedules table
ALTER PUBLICATION supabase_realtime ADD TABLE schedules;
ALTER TABLE schedules REPLICA IDENTITY FULL;

-- Enable realtime for the announcements table
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
ALTER TABLE announcements REPLICA IDENTITY FULL;
