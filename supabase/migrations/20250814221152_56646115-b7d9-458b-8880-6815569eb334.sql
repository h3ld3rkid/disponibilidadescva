-- Phase 1: Critical Security Fixes

-- First, let's create a proper password hashing function
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use crypt function with blowfish algorithm for secure password hashing
  RETURN crypt(password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify password
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN crypt(password, hash) = hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user roles enum for proper role management
CREATE TYPE public.user_role AS ENUM ('admin', 'user');

-- Add a proper role column to users table and update password security
ALTER TABLE public.users 
  ALTER COLUMN role TYPE user_role USING role::user_role,
  ALTER COLUMN password_hash SET DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Update existing users to remove plain text passwords and set proper roles
UPDATE public.users 
SET 
  password_hash = public.hash_password('CVAmares_' || substr(id::text, 1, 8)),
  is_admin = CASE WHEN role = 'admin' THEN TRUE ELSE FALSE END,
  needs_password_change = TRUE
WHERE password_hash = 'CVAmares' OR password_hash = 'CVAmares'::text;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email' 
    AND (role = 'admin' OR is_admin = TRUE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get current user email from JWT
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::json->>'email';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Now let's fix all the RLS policies

-- DROP existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert users" ON public.users;
DROP POLICY IF EXISTS "Anyone can select users" ON public.users;
DROP POLICY IF EXISTS "Anyone can update users" ON public.users;

DROP POLICY IF EXISTS "Anyone can access schedules" ON public.schedules;
DROP POLICY IF EXISTS "Anyone can access admin notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Anyone can access system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Anyone can access password resets" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Anyone can access exchange requests" ON public.shift_exchange_requests;
DROP POLICY IF EXISTS "Anyone can access announcements" ON public.announcements;

-- USERS TABLE - Secure policies
CREATE POLICY "Users can view their own profile" 
ON public.users FOR SELECT 
USING (email = public.get_current_user_email());

CREATE POLICY "Admins can view all users" 
ON public.users FOR SELECT 
USING (public.is_current_user_admin());

CREATE POLICY "Admins can insert users" 
ON public.users FOR INSERT 
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Users can update their own profile" 
ON public.users FOR UPDATE 
USING (email = public.get_current_user_email());

CREATE POLICY "Admins can update any user" 
ON public.users FOR UPDATE 
USING (public.is_current_user_admin());

-- SCHEDULES TABLE - Users can only see their own schedules, admins see all
CREATE POLICY "Users can view their own schedules" 
ON public.schedules FOR SELECT 
USING (user_email = public.get_current_user_email());

CREATE POLICY "Admins can view all schedules" 
ON public.schedules FOR SELECT 
USING (public.is_current_user_admin());

CREATE POLICY "Users can create their own schedules" 
ON public.schedules FOR INSERT 
WITH CHECK (user_email = public.get_current_user_email());

CREATE POLICY "Users can update their own schedules" 
ON public.schedules FOR UPDATE 
USING (user_email = public.get_current_user_email());

CREATE POLICY "Admins can update any schedule" 
ON public.schedules FOR UPDATE 
USING (public.is_current_user_admin());

CREATE POLICY "Users can delete their own schedules" 
ON public.schedules FOR DELETE 
USING (user_email = public.get_current_user_email());

-- ADMIN NOTIFICATIONS - Admin only
CREATE POLICY "Only admins can access admin notifications" 
ON public.admin_notifications FOR ALL 
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- SYSTEM SETTINGS - Admin only
CREATE POLICY "Only admins can read system settings" 
ON public.system_settings FOR SELECT 
USING (public.is_current_user_admin());

CREATE POLICY "Only admins can modify system settings" 
ON public.system_settings FOR ALL 
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- PASSWORD RESET REQUESTS - Admin only
CREATE POLICY "Only admins can access password reset requests" 
ON public.password_reset_requests FOR ALL 
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- SHIFT EXCHANGE REQUESTS - Only involved parties can see
CREATE POLICY "Users can view exchanges they are involved in" 
ON public.shift_exchange_requests FOR SELECT 
USING (
  requester_email = public.get_current_user_email() OR 
  target_email = public.get_current_user_email() OR 
  public.is_current_user_admin()
);

CREATE POLICY "Users can create exchange requests" 
ON public.shift_exchange_requests FOR INSERT 
WITH CHECK (requester_email = public.get_current_user_email());

CREATE POLICY "Target users can update exchange requests" 
ON public.shift_exchange_requests FOR UPDATE 
USING (
  target_email = public.get_current_user_email() OR 
  requester_email = public.get_current_user_email() OR 
  public.is_current_user_admin()
);

-- ANNOUNCEMENTS - Everyone can read, only admins can modify
CREATE POLICY "Everyone can view announcements" 
ON public.announcements FOR SELECT 
USING (true);

CREATE POLICY "Only admins can create announcements" 
ON public.announcements FOR INSERT 
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Only admins can update announcements" 
ON public.announcements FOR UPDATE 
USING (public.is_current_user_admin());

CREATE POLICY "Only admins can delete announcements" 
ON public.announcements FOR DELETE 
USING (public.is_current_user_admin());

-- Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs" 
ON public.audit_logs FOR SELECT 
USING (public.is_current_user_admin());

-- Function to log sensitive operations
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.audit_logs (user_email, action, table_name, record_id, old_values, new_values)
  VALUES (public.get_current_user_email(), p_action, p_table_name, p_record_id, p_old_values, p_new_values);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;