-- Enable Row Level Security on admin_notifications table
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for admin_notifications (since app handles auth differently)
CREATE POLICY "Allow all operations on admin_notifications" 
ON public.admin_notifications 
FOR ALL 
USING (true) 
WITH CHECK (true);