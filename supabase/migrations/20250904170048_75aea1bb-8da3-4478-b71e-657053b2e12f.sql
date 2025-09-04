-- Add telegram_chat_id field to users table
ALTER TABLE public.users ADD COLUMN telegram_chat_id text;