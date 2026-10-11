CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'outro',
  location text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO anon, authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage events" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update events" ON public.events FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete events" ON public.events FOR DELETE USING (true);
CREATE INDEX IF NOT EXISTS events_start_at_idx ON public.events (start_at);
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.tab_visibility (tab_key, tab_label, visible)
SELECT 'events', 'Eventos', true
WHERE NOT EXISTS (SELECT 1 FROM public.tab_visibility WHERE tab_key = 'events');