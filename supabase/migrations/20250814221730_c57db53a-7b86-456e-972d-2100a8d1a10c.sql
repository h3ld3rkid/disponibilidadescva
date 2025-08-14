-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the hash_password function to use the pgcrypto extension
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use crypt function with blowfish algorithm for secure password hashing
  RETURN crypt(password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create a test admin user for login
INSERT INTO users (name, email, mechanographic_number, role, is_admin, password_hash, needs_password_change, active)
SELECT 
  'Admin Test',
  'admin@cvamares.pt',
  '999999',
  'admin',
  true,
  public.hash_password('admin123'),
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@cvamares.pt');

-- Also activate the existing admin user and give them a known password
UPDATE users 
SET active = true, 
    password_hash = public.hash_password('admin123'),
    needs_password_change = true,
    is_admin = true
WHERE email = 'ccdanielcosta@gmail.com' AND role = 'admin';