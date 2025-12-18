-- Add failed_login_attempts column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS failed_login_attempts integer DEFAULT 0;

-- Add locked_at column to track when user was locked
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone DEFAULT NULL;