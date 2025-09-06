-- Enable RLS on all public tables that don't have it yet
ALTER TABLE IF EXISTS public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shift_exchange_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.password_reset_requests ENABLE ROW LEVEL SECURITY;