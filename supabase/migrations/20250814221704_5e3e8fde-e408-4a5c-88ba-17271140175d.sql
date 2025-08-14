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

-- Also activate the existing admin user
UPDATE users 
SET active = true, 
    password_hash = public.hash_password('admin123'),
    needs_password_change = true,
    is_admin = true
WHERE email = 'ccdanielcosta@gmail.com' AND role = 'admin';