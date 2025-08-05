-- Create admin_notifications table
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  user_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Anyone can access admin notifications" 
ON public.admin_notifications 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Enable realtime for admin notifications
ALTER TABLE public.admin_notifications REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.admin_notifications;