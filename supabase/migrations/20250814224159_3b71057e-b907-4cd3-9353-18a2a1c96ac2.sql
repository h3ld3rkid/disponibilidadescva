-- Complete database restoration
-- Drop and recreate all tables and functions

-- Drop existing tables
DROP TABLE IF EXISTS admin_notifications CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS shift_exchange_requests CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS password_reset_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS authenticate_user CASCADE;
DROP FUNCTION IF EXISTS simple_verify_password CASCADE;
DROP FUNCTION IF EXISTS hash_password CASCADE;
DROP FUNCTION IF EXISTS verify_password CASCADE;
DROP FUNCTION IF EXISTS get_current_user_email CASCADE;
DROP FUNCTION IF EXISTS is_current_user_admin CASCADE;
DROP FUNCTION IF EXISTS check_and_reset_monthly_counters CASCADE;
DROP FUNCTION IF EXISTS reset_edit_counters CASCADE;
DROP FUNCTION IF EXISTS get_admin_notifications CASCADE;
DROP FUNCTION IF EXISTS mark_notification_read CASCADE;
DROP FUNCTION IF EXISTS mark_all_notifications_read CASCADE;

-- Create users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    mechanographic_number TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_admin BOOLEAN DEFAULT false,
    password_hash TEXT NOT NULL DEFAULT '',
    needs_password_change BOOLEAN NOT NULL DEFAULT true,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create utility functions
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::json->>'email';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE email = get_current_user_email() 
    AND (role = 'admin' OR is_admin = TRUE)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public';

-- Create authentication function
CREATE OR REPLACE FUNCTION public.authenticate_user(
  p_email TEXT,
  p_password TEXT
) RETURNS TABLE(
  success BOOLEAN,
  user_email TEXT,
  user_role TEXT,
  user_name TEXT,
  needs_password_change BOOLEAN
) AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Get user record
  SELECT * INTO user_record
  FROM public.users
  WHERE email = p_email AND active = true;
  
  -- If no user found, return failure
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::BOOLEAN;
    RETURN;
  END IF;
  
  -- Simple password check
  IF p_password != user_record.password_hash THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::BOOLEAN;
    RETURN;
  END IF;
  
  -- Return success with user details
  RETURN QUERY SELECT 
    true,
    user_record.email,
    user_record.role::TEXT,
    user_record.name,
    user_record.needs_password_change;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create users RLS policies
CREATE POLICY "Users can view their own profile" ON public.users
FOR SELECT USING (email = get_current_user_email());

CREATE POLICY "Users can update their own profile" ON public.users
FOR UPDATE USING (email = get_current_user_email());

CREATE POLICY "Admins can view all users" ON public.users
FOR SELECT USING (is_current_user_admin());

CREATE POLICY "Admins can update any user" ON public.users
FOR UPDATE USING (is_current_user_admin());

CREATE POLICY "Admins can insert users" ON public.users
FOR INSERT WITH CHECK (is_current_user_admin());

-- Create schedules table
CREATE TABLE public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own schedules" ON public.schedules
FOR SELECT USING (user_email = get_current_user_email());

CREATE POLICY "Users can create their own schedules" ON public.schedules
FOR INSERT WITH CHECK (user_email = get_current_user_email());

CREATE POLICY "Users can update their own schedules" ON public.schedules
FOR UPDATE USING (user_email = get_current_user_email());

CREATE POLICY "Users can delete their own schedules" ON public.schedules
FOR DELETE USING (user_email = get_current_user_email());

CREATE POLICY "Admins can view all schedules" ON public.schedules
FOR SELECT USING (is_current_user_admin());

CREATE POLICY "Admins can update any schedule" ON public.schedules
FOR UPDATE USING (is_current_user_admin());

-- Create announcements table
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view announcements" ON public.announcements
FOR SELECT USING (true);

CREATE POLICY "Only admins can create announcements" ON public.announcements
FOR INSERT WITH CHECK (is_current_user_admin());

CREATE POLICY "Only admins can update announcements" ON public.announcements
FOR UPDATE USING (is_current_user_admin());

CREATE POLICY "Only admins can delete announcements" ON public.announcements
FOR DELETE USING (is_current_user_admin());

-- Create shift_exchange_requests table
CREATE TABLE public.shift_exchange_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_email TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    target_email TEXT NOT NULL,
    target_name TEXT NOT NULL,
    requested_date TEXT NOT NULL,
    requested_shift TEXT NOT NULL,
    offered_date TEXT NOT NULL,
    offered_shift TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_exchange_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exchanges they are involved in" ON public.shift_exchange_requests
FOR SELECT USING (
  (requester_email = get_current_user_email()) OR 
  (target_email = get_current_user_email()) OR 
  is_current_user_admin()
);

CREATE POLICY "Users can create exchange requests" ON public.shift_exchange_requests
FOR INSERT WITH CHECK (requester_email = get_current_user_email());

CREATE POLICY "Target users can update exchange requests" ON public.shift_exchange_requests
FOR UPDATE USING (
  (target_email = get_current_user_email()) OR 
  (requester_email = get_current_user_email()) OR 
  is_current_user_admin()
);

-- Create system_settings table
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read system settings" ON public.system_settings
FOR SELECT USING (is_current_user_admin());

CREATE POLICY "Only admins can modify system settings" ON public.system_settings
FOR ALL USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- Create password_reset_requests table
CREATE TABLE public.password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    fulfilled BOOLEAN DEFAULT false,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can access password reset requests" ON public.password_reset_requests
FOR ALL USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- Create admin_notifications table
CREATE TABLE public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    user_email TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can access admin notifications" ON public.admin_notifications
FOR ALL USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- Create admin notification functions
CREATE OR REPLACE FUNCTION public.get_admin_notifications()
RETURNS TABLE(id UUID, message TEXT, user_email TEXT, created_at TIMESTAMP WITH TIME ZONE, is_read BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    an.id,
    an.message,
    an.user_email,
    an.created_at,
    an.is_read
  FROM admin_notifications an
  ORDER BY an.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE admin_notifications 
  SET is_read = true 
  WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
  UPDATE admin_notifications 
  SET is_read = true 
  WHERE is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create the working admin user
INSERT INTO public.users (name, email, mechanographic_number, role, is_admin, password_hash, needs_password_change, active)
VALUES (
  'Administrator',
  'admin@cvamares.pt',
  'ADM001',
  'admin',
  true,
  'admin123',
  false,
  true
);

-- Insert sample announcement
INSERT INTO public.announcements (title, content, start_date, end_date, created_by)
VALUES (
  'Sistema Restaurado',
  'O sistema foi restaurado para o estado de funcionamento. Podem fazer login normalmente.',
  now(),
  now() + interval '30 days',
  'admin@cvamares.pt'
);