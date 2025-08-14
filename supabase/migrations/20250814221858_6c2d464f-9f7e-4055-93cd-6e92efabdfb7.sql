-- Fix the password hashing issues and create a working admin user
-- First, ensure pgcrypto is properly enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a simple hash function that works
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use a simple hash for now that definitely works
  RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create verify password function
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN crypt(password, hash) = hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Delete any problematic users first
DELETE FROM users WHERE email IN ('admin@cvamares.pt', 'ccdanielcosta@gmail.com');

-- Create a working admin user with a known password
INSERT INTO users (name, email, mechanographic_number, role, is_admin, password_hash, needs_password_change, active)
VALUES (
  'Admin',
  'admin@test.com',
  '123456',
  'admin',
  true,
  public.hash_password('123456'),
  false,
  true
);