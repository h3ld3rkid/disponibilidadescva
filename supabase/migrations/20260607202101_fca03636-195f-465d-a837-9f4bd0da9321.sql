
-- 1. Add calendar_token to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS calendar_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS users_calendar_token_idx ON public.users(calendar_token);

-- 2. Cache table
CREATE TABLE IF NOT EXISTS public.user_service_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL UNIQUE,
  mechanographic_number text NOT NULL,
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_service_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_service_cache TO anon;
GRANT ALL ON public.user_service_cache TO service_role;

ALTER TABLE public.user_service_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read user_service_cache"
  ON public.user_service_cache FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert user_service_cache"
  ON public.user_service_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update user_service_cache"
  ON public.user_service_cache FOR UPDATE
  USING (true);

CREATE TRIGGER update_user_service_cache_updated_at
  BEFORE UPDATE ON public.user_service_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
