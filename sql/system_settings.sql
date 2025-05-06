
-- Function to get a system setting
CREATE OR REPLACE FUNCTION public.get_system_setting(setting_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT value FROM public.system_settings
    WHERE key = setting_key
    LIMIT 1
  );
END;
$$;

-- Function to upsert a system setting
CREATE OR REPLACE FUNCTION public.upsert_system_setting(
  setting_key TEXT,
  setting_value TEXT,
  setting_description TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.system_settings (key, value, description)
  VALUES (setting_key, setting_value, setting_description)
  ON CONFLICT (key)
  DO UPDATE SET
    value = setting_value,
    description = COALESCE(setting_description, system_settings.description),
    updated_at = now();
END;
$$;
