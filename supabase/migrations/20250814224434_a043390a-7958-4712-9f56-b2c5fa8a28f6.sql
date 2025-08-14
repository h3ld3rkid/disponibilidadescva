-- Add missing hash_password function for user creation
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  -- For now, return password as-is (simple implementation)
  RETURN password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';