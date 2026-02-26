
INSERT INTO public.tab_visibility (tab_key, tab_label, visible) VALUES
  ('dashboard', 'Início', true),
  ('current-schedule', 'Escala', true),
  ('profile', 'Perfil', true)
ON CONFLICT (tab_key) DO NOTHING;
