-- Complete database reset - delete everything and recreate from scratch
-- This will create a clean, working system

-- Drop all existing tables and functions
DROP TABLE IF EXISTS admin_notifications CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS shift_exchange_requests CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS password_reset_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop all functions
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

-- Disable RLS on auth.users to avoid conflicts
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- Create users table (simple structure)
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

-- Disable RLS for users table initially
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Create simple authentication function
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Disable RLS for schedules
ALTER TABLE public.schedules DISABLE ROW LEVEL SECURITY;

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

-- Disable RLS for announcements
ALTER TABLE public.announcements DISABLE ROW LEVEL SECURITY;

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

-- Disable RLS for shift_exchange_requests
ALTER TABLE public.shift_exchange_requests DISABLE ROW LEVEL SECURITY;

-- Create system_settings table
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Disable RLS for system_settings
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;

-- Create password_reset_requests table
CREATE TABLE public.password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    fulfilled BOOLEAN DEFAULT false,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Disable RLS for password_reset_requests
ALTER TABLE public.password_reset_requests DISABLE ROW LEVEL SECURITY;

-- Create admin_notifications table
CREATE TABLE public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    user_email TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Disable RLS for admin_notifications
ALTER TABLE public.admin_notifications DISABLE ROW LEVEL SECURITY;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE admin_notifications 
  SET is_read = true 
  WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
  UPDATE admin_notifications 
  SET is_read = true 
  WHERE is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  'Sistema Completamente Restaurado',
  'A base de dados foi completamente recriada. Tudo deve funcionar agora perfeitamente.',
  now(),
  now() + interval '30 days',
  'admin@cvamares.pt'
);