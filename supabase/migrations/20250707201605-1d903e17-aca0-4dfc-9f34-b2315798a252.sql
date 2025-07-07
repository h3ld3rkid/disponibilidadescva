-- Drop all existing tables and recreate from scratch
DROP TABLE IF EXISTS public.security_logs CASCADE;
DROP TABLE IF EXISTS public.shift_exchange_requests CASCADE;
DROP TABLE IF EXISTS public.schedules CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.password_reset_requests CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;

-- Drop functions and triggers
DROP FUNCTION IF EXISTS public.validate_password(text) CASCADE;
DROP FUNCTION IF EXISTS public.log_security_event CASCADE;
DROP FUNCTION IF EXISTS public.detect_failed_login_attempts CASCADE;
DROP FUNCTION IF EXISTS public.get_system_setting CASCADE;
DROP FUNCTION IF EXISTS public.upsert_system_setting CASCADE;

-- Recreate users table
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mechanographic_number TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL DEFAULT 'CVAmares',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  active BOOLEAN NOT NULL DEFAULT true,
  needs_password_change BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies for users
CREATE POLICY "Anyone can select users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update users" ON public.users FOR UPDATE USING (true);

-- Recreate schedules table
CREATE TABLE public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  month TEXT NOT NULL,
  dates JSONB NOT NULL,
  notes TEXT,
  edit_count INTEGER DEFAULT 0,
  printed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on schedules
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies for schedules
CREATE POLICY "Anyone can access schedules" ON public.schedules FOR ALL USING (true) WITH CHECK (true);

-- Recreate announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies for announcements
CREATE POLICY "Anyone can access announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);

-- Recreate shift_exchange_requests table
CREATE TABLE public.shift_exchange_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_email TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  target_email TEXT NOT NULL,
  target_name TEXT NOT NULL,
  requested_date TEXT NOT NULL,
  requested_shift TEXT NOT NULL,
  offered_date TEXT NOT NULL,
  offered_shift TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on shift_exchange_requests
ALTER TABLE public.shift_exchange_requests ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies for shift_exchange_requests
CREATE POLICY "Anyone can access exchange requests" ON public.shift_exchange_requests FOR ALL USING (true) WITH CHECK (true);

-- Recreate system_settings table
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies for system_settings
CREATE POLICY "Anyone can access system settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

-- Recreate password_reset_requests table
CREATE TABLE public.password_reset_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  fulfilled BOOLEAN DEFAULT false,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on password_reset_requests
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies for password_reset_requests
CREATE POLICY "Anyone can access password resets" ON public.password_reset_requests FOR ALL USING (true) WITH CHECK (true);

-- Add some system settings
INSERT INTO public.system_settings (key, value, description) VALUES 
('email_notifications_enabled', 'true', 'Enable/disable email notifications for shift exchanges'),
('smtp_from_email', 'noreply@cruzvermelha-amares.pt', 'Email address to send notifications from'),
('app_name', 'Cruz Vermelha Amares', 'Application name for email templates');

-- Create a default admin user
INSERT INTO public.users (email, name, mechanographic_number, password_hash, role, needs_password_change) 
VALUES ('admin@cvamares.pt', 'Administrator', 'ADM001', 'CVAmares', 'admin', true);