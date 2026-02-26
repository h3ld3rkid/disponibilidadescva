
-- Table to store tab visibility settings
CREATE TABLE public.tab_visibility (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tab_key text UNIQUE NOT NULL,
  tab_label text NOT NULL,
  visible boolean DEFAULT true NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.tab_visibility ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Anyone can read tab_visibility"
ON public.tab_visibility FOR SELECT
USING (true);

-- Only admins can update
CREATE POLICY "Admins can update tab_visibility"
ON public.tab_visibility FOR UPDATE
USING (public.is_admin_user());

CREATE POLICY "Admins can insert tab_visibility"
ON public.tab_visibility FOR INSERT
WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can delete tab_visibility"
ON public.tab_visibility FOR DELETE
USING (public.is_admin_user());

-- Insert default tabs
INSERT INTO public.tab_visibility (tab_key, tab_label, visible) VALUES
  ('my-services', 'Meus Serviços', true),
  ('updated-schedule', 'Escala Atualizada', true),
  ('schedule', 'Escala', true),
  ('exchanges', 'Trocas', true),
  ('announcements', 'Comunicados', true);
