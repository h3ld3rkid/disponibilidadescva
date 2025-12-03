-- Add categoria column to users table
ALTER TABLE public.users 
ADD COLUMN categoria text NULL;

-- Add a check constraint to ensure only valid values
ALTER TABLE public.users 
ADD CONSTRAINT users_categoria_check 
CHECK (categoria IS NULL OR categoria IN ('Condutor', 'Socorrista', 'Estagiario'));